![Build Status](https://img.shields.io/github/actions/workflow/status/projects-md/markdown-entity-parser/main.yml?branch=main)
![GitHub package.json version](https://img.shields.io/github/package-json/v/projects-md/markdown-entity-parser)
![GitHub All Releases](https://img.shields.io/github/downloads/projects-md/markdown-entity-parser/total)

# markdown-entity-parser

Parse entities from markdown files into JSON/YAML via CLI or NodeJS API

## Requirements

- Node.js >= 18

# Usage

## Installation

```bash
npm install @projects-md/markdown-entity-parser
```

## Usage via Node.js API

```js
import { parseStructuredMarkdown } from '@projects-md/markdown-entity-parser';

const markdown = `
# {project} Project A
Description Text
`;

const entities = parseStructuredMarkdown(markdown);
console.log(entities);
```

Output:

```json
{
  "project": [
    {
      "name": "Project A",
      "description": "Description Text"
    }
  ]
}
```

## Usage via CLI

You can use the CLI to parse markdown files into YAML.

```bash
./node_modules/.bin/markdown-entity-parser source.md > target.yaml
```

# Syntax Example

~~~markdown
# {project} Project A
 
```yaml
color: '#00fbff'
```
Project Desciption

## {milestone} Research
```yaml
team: Team A
release: 23.7
```

Milestone Description

### {task} Task 1
```yaml
sprint: 23.7 S1
estimate: 8
assignee: john.doe
status: In Progress
```

Optional Task Description

### {task} Task 2
```yaml
sprint: 23.7 S1
estimate: 3
assignee: john.doe
status: Done
```

### {task} Task 3
```yaml
sprint: 23.7 S2
estimate: 5
```
~~~
