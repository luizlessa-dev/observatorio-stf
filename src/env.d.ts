/* eslint-disable @typescript-eslint/triple-slash-reference -- é a única forma de
   trazer os tipos ambientes gerados (astro:content, Astro.props) para o programa
   TypeScript; sem isso, `astro:content` não resolve em `tsc`/`astro check`. */
/// <reference path="../.astro/types.d.ts" />
