#!/usr/bin/env ruby
# Regenerate _includes/travel_map_world.svg from Natural Earth 110m countries.
# Run from project root:  ruby bin/build_world_svg.rb

require "net/http"
require "json"
require "uri"

SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/" \
         "master/geojson/ne_110m_admin_0_countries.geojson"
OUT = "_includes/travel_map_world.svg"
W = 1000
H = 500

puts "Fetching #{SOURCE}"
geojson = JSON.parse(Net::HTTP.get(URI(SOURCE)))

project = ->(lon, lat) {
  x = ((lon + 180.0) / 360.0) * W
  y = ((90.0 - lat) / 180.0) * H
  [format("%.2f", x), format("%.2f", y)]
}

ring_to_d = ->(ring) {
  ring.each_with_index.map { |(lon, lat), i|
    x, y = project.call(lon, lat)
    i.zero? ? "M#{x} #{y}" : "L#{x} #{y}"
  }.join(" ") + " Z"
}

paths = geojson["features"].map { |f|
  geom = f["geometry"]
  next nil unless geom
  polys = case geom["type"]
          when "Polygon"      then [geom["coordinates"]]
          when "MultiPolygon" then geom["coordinates"]
          else []
          end
  d = polys.flatten(1).map(&ring_to_d).join(" ")
  d.empty? ? nil : %(  <path d="#{d}"/>)
}.compact

File.write(OUT, <<~SVG)
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 #{W} #{H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
  <g class="travel-map__countries">
  #{paths.join("\n")}
  </g>
  </svg>
SVG

puts "Wrote #{OUT} (#{File.size(OUT)} bytes, #{paths.length} country paths)"
