---
layout: page
permalink: /publications/
title: All Publications
description: Peer-reviewed papers, newest first, then conference abstracts.
nav: true
nav_order: 2
---

<!-- _pages/publications.md -->

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

## Peer-reviewed papers

<div class="publications">

{% bibliography --query @*[category=paper] %}

</div>

## Conference abstracts

<div class="publications">

{% bibliography --query @*[category=abstract] %}

</div>
