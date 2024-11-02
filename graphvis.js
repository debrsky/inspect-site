import { readFile, writeFile } from "fs/promises";

const links = JSON.parse(await readFile('storage/pages.json', 'utf8'));

let graph = 'digraph G{\n';

graph += '    layout=neato;\n';
graph += '    node [shape=circle];\n';
graph += '\n';


for (const [idx, link] of links.entries()) {
  const url = cleanUrl(link.url);

  if (link.linksTo) {
    for (const linkTo of link.linksTo) {
      const linkToUrl = cleanUrl(linkTo.url);

      const idxTo = links.findIndex(({ url }) => url === linkTo.url);

      if (idxTo === -1) {
        continue;
      }

      graph += `    "${idx}" -> "${idxTo}";\n`;
    };
  };
};

graph += '}\n';

writeFile('storage/pages.dot', graph, 'utf8');

console.log("∎");

function cleanUrl(url) {
  return url.replace('https://bergvl.ru/', '');
}
