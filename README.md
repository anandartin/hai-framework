# Human-Centred Agentic Intelligence (HAI)

A dual-mode, three-layer design methodology for mapping human–agent–system journeys, with a Sovereign AI extension.

- **Site:** https://hai-framework.org
- **Author:** Anandakumar Muniasamy Pothiraj · [ORCID 0009-0007-3713-7704](https://orcid.org/0009-0007-3713-7704)
- **Edition:** v2 · May 2026 · DOI [10.5281/zenodo.20389202](https://doi.org/10.5281/zenodo.20389202)
- **License:** [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)

The whitepaper PDF and journey matrix template are hosted on Zenodo and linked from the site.

## Project structure

```
index.html          landing page
404.html            not-found page
css/style.css       styles
js/main.js          nav, scroll-spy, reveal, BibTeX copy, clock
js/hero-network.js  hero canvas animation
assets/img/         layer and agent-mode icons, header image
favicon.svg  robots.txt  sitemap.xml
_headers            Cloudflare security and cache headers
```

It is a plain static site with no build step.

## Local preview

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → select the repo.
3. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: `/` (root).
4. Deploy, then add the custom domain `hai-framework.org` under the project's Custom domains tab.

## Citation

```bibtex
@techreport{pothiraj2026hai,
  author      = {Pothiraj, Anandakumar Muniasamy},
  title       = {{Human-Centred Agentic Intelligence (HAI): A Three-Layer Framework for Designing Human-Agent-System Journeys}},
  institution = {Independent Researcher},
  address     = {London, United Kingdom},
  year        = {2026},
  month       = may,
  type        = {Whitepaper},
  doi         = {10.5281/zenodo.20389202}
}
```

© 2026 Anandakumar Muniasamy Pothiraj · UK Copyright, Designs and Patents Act 1988
