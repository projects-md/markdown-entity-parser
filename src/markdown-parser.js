import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { visit, CONTINUE, SKIP } from "unist-util-visit";
import { parse as parseYaml } from "yaml";

export function parseStructuredMarkdown(markdown) {
  const entityStack = createEntityStack();
  const entitiesStore = createEntityStore();
  let lastNodeCreatedEntity = false;

  visit(fromMarkdown(markdown), (node) => {
    if (node.type === "text" || node.type === "root") {
      return CONTINUE;
    }

    if (node.type === "heading") {
      const newEntity = handleHeading(node, entitiesStore, entityStack);
      if (newEntity) {
        // headings that are entities should not be included in the tree
        lastNodeCreatedEntity = true;
        return SKIP;
      }
      // heading is not an entity itself, so Should be handled like any other node in the tree
    }

    const currentEntity = entityStack.getCurrentEntity();
    if (!currentEntity) {
      // no entity is currently being processed, so this node should be ignored
      return SKIP;
    }

    if (node.type === "code" && node.lang === "yaml" && lastNodeCreatedEntity) {
      // yaml blocks after an entity heading are considered to be the entity's data
      Object.assign(currentEntity.data, parseYaml(node.value));
      lastNodeCreatedEntity = false;
      return SKIP;
    }

    // any other node is considered to be a child of the current entity
    currentEntity.children.push(node);
    lastNodeCreatedEntity = false;
    return SKIP;
  });

  return formatEntities(entitiesStore);
}

export function createEntityStore() {
  const entities = {};
  const instance = {};

  instance.add = (entity) => {
    entities[entity.type] = entities[entity.type] || [];
    entities[entity.type].push(entity);
  };

  instance.get = (type, name) => {
    const entity = entities[type]?.find((entity) => entity.name === name);
    return entity ?? null;
  };

  instance.getAll = () => entities;

  return instance;
}

export function createEntityStack() {
  const instance = {};
  const stack = [];

  instance.add = (entity) => stack.push(entity);

  instance.detectRelevantEntity = (currentDepth) => {
    while (stack.length) {
      const item = stack[stack.length - 1];
      if (item.depth < currentDepth) {
        return item;
      }
      stack.pop();
    }
    return null;
  };

  instance.getCurrentEntity = () => stack[stack.length - 1] ?? null;

  return instance;
}

export function handleHeading(node, entitiesStore, entityStack) {
  const parentEntity = entityStack.detectRelevantEntity(node.depth);
  const entity = createEntityFromText(getHeadingText(node), node.depth, parentEntity);

  if (entity) {
    entitiesStore.add(entity);
    entityStack.add(entity, node.depth);
  }
  return entity;
}

export function getHeadingText(node) {
  if (node?.type !== "heading") return null;
  return node.children
    .filter((child) => child.type === "text")
    .map((child) => child.value)
    .join("");
}

export function createEntityFromText(text, depth, parent) {
  const matches = /^{([^}]+)}([^$]+)$/g.exec(text);
  if (!matches) return null;

  const [, type, name] = matches;
  return {
    type: type.trim(),
    name: name.trim(),
    depth,
    children: [],
    data: {},
    parent
  };
}

export function formatEntities(entitiesStore) {
  const result = {};

  Object.entries(entitiesStore.getAll()).forEach(([type, entities]) => {
    result[type] = entities.map((entity) => {
      const formattedEntity = { name: entity.name, ...entity.data };
      if (entity.parent) {
        formattedEntity[entity.parent.type] = entity.parent.name;
      }
      if (entity.children.length) {
        formattedEntity.description = toMarkdown({ type: "root", children: entity.children });
      }
      return formattedEntity;
    });
  });

  return result;
}
