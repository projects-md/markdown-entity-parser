#!/usr/bin/env node

import { resolve } from "path";
import { readFile } from "fs/promises";
import { merge } from "lodash-es";
import { glob } from "glob";
import { parseStructuredMarkdown } from "./structured-markdown-parser.js";
import { stringify as stringifyYaml } from "yaml";

async function main() {
  const inputPattern = process.argv[2];
  const files = await glob(inputPattern);
  let allEntities = {};

  for (const filePath of files) {
    if (!isMarkdownFile(filePath)) continue;
    const absoluteFilePath = resolve(filePath);
    const content = await readFile(absoluteFilePath, "utf8");
    const fileEntities = parseStructuredMarkdown(content);
    allEntities = merge(allEntities, fileEntities);
  }

  process.stdout.write(stringifyYaml(allEntities));
  process.exit(0);
}

function isMarkdownFile(filePath) {
  return filePath.endsWith(".md");
}

main();
