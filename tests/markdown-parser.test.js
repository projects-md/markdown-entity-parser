import {
  createEntityFromText,
  createEntityStack,
  createEntityStore,
  formatEntities,
  getHeadingText,
  parseStructuredMarkdown
} from "../src/markdown-parser";

test("parseStructuredMarkdown", () => {
  const markdown = `
  # {typeA} item 1
  \`\`\`yaml
  a: 1
  b: 2
  \`\`\`

  My Description

  ## {typeB} item 2
  \`\`\`yaml
  c: 3
  \`\`\`

  # {typeA} item 3
  Description

   \`\`\`yaml
   ignore: me
   \`\`\`

  ## {typeB} item 4
  - foo
  - bar

  # reset / should be ignored

  ## {typeB} item 5
  \`\`\`yaml
  d: 4
  \`\`\`
  `;

  const entities = parseStructuredMarkdown(markdown);
  expect(entities.typeA.length).toBe(2);
  expect(entities.typeB.length).toBe(3);

  expect(entities.typeA[0]).toEqual({
    name: "item 1",
    a: 1,
    b: 2,
    description: "My Description\n"
  });

  expect(entities.typeA[1]).toEqual({
    name: "item 3",
    description: "Description\n\n```yaml\nignore: me\n```\n"
  });

  expect(entities.typeB[0]).toEqual({
    name: "item 2",
    c: 3,
    typeA: "item 1"
  });

  expect(entities.typeB[1]).toEqual({
    name: "item 4",
    typeA: "item 3",
    description: "* foo\n* bar\n"
  });

  expect(entities.typeB[2]).toEqual({
    name: "item 5",
    d: 4
  });
});

test("createEntityStore", () => {
  const entityStore = createEntityStore();
  const entity1 = { type: "typeA", name: "item 1" };
  const entity2 = { type: "typeA", name: "item 2" };

  entityStore.add(entity1);
  entityStore.add(entity2);

  expect(entityStore.get("typeA", "item 1")).toBe(entity1);
  expect(entityStore.get("typeA", "item 2")).toBe(entity2);
  expect(entityStore.get("typeA", "item 3")).toBe(null);
  expect(entityStore.get("typeB", "item 1")).toBe(null);

  expect(entityStore.getAll()).toEqual({
    typeA: [entity1, entity2]
  });
});

test("createEntityStack", () => {
  const entityStack = createEntityStack();
  const entity1 = { type: "typeA", name: "item 1", depth: 1 };
  const entity2 = { type: "typeA", name: "item 1", depth: 2 };

  expect(entityStack.getCurrentEntity()).toBe(null);

  entityStack.add(entity1);
  expect(entityStack.getCurrentEntity()).toBe(entity1);
  expect(entityStack.detectRelevantEntity(2)).toBe(entity1);

  entityStack.add(entity2);
  expect(entityStack.getCurrentEntity()).toBe(entity2);
  expect(entityStack.detectRelevantEntity(3)).toBe(entity2);

  // when depth is equal or greater than current entity, it should go back to the previous entity
  expect(entityStack.detectRelevantEntity(2)).toBe(entity1);
  expect(entityStack.getCurrentEntity()).toBe(entity1);

  // when returning to the root, it should return null
  expect(entityStack.detectRelevantEntity(1)).toBe(null);
  expect(entityStack.getCurrentEntity()).toBe(null);
});

test("getHeadingText", () => {
  expect(
    getHeadingText({
      type: "heading",
      children: [{ type: "text", value: "foo" }]
    })
  ).toBe("foo");
  expect(
    getHeadingText({
      type: "heading",
      children: [
        { type: "text", value: "foo" },
        { type: "text", value: "bar" }
      ]
    })
  ).toBe("foobar");
});

test("createEntityFromText", () => {
  expect(createEntityFromText("foo", 1, null)).toEqual(null);

  const entity = createEntityFromText("{foo} bar", 1, null);
  expect(entity).toEqual({
    type: "foo",
    name: "bar",
    data: {},
    depth: 1,
    parent: null,
    children: []
  });

  const entity2 = createEntityFromText("{ boo } baz ", 2, entity);
  expect(entity2).toEqual({
    type: "boo",
    name: "baz",
    data: {},
    depth: 2,
    parent: entity,
    children: []
  });
});

test("formatEntities", () => {
  const entitiesStore = createEntityStore();
  expect(formatEntities(entitiesStore)).toEqual({});

  const bareEntity = createEntityFromText("{typeA} item 1", 1, null);
  entitiesStore.add(bareEntity);
  expect(formatEntities(entitiesStore)).toEqual({ typeA: [{ name: "item 1" }] });

  const entityWithData = createEntityFromText("{typeA} item 2", 2, null);
  entityWithData.data = { a: 1 };
  entitiesStore.add(entityWithData);
  expect(formatEntities(entitiesStore)).toEqual({
    typeA: [{ name: "item 1" }, { name: "item 2", a: 1 }]
  });

  const entityWithParentAndChildren = createEntityFromText("{typeB} item 3", 3, entityWithData);
  entityWithParentAndChildren.data = { b: 2 };
  entityWithParentAndChildren.children = [
    { type: "heading", children: [{ type: "text", value: "foo" }] },
    { type: "paragraph", children: [{ type: "text", value: "bar" }] }
  ];
  entitiesStore.add(entityWithParentAndChildren);
  expect(formatEntities(entitiesStore)).toEqual({
    typeA: [{ name: "item 1" }, { name: "item 2", a: 1 }],
    typeB: [
      {
        name: "item 3",
        b: 2,
        typeA: "item 2",
        description: "# foo\n\nbar\n"
      }
    ]
  });
});
