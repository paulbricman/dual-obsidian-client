import { removeMd } from "../utils";

describe("`removeMd`", () => {
  const exampleNote = `
---
title: This is a note
---

# A header

This is the content.

## Another header

This is more content.

![Image alt text](/image.png)

[1]: Footnote. [A footnote link](http://example.com)

`;

  test("works", () => {
    expect(removeMd(exampleNote)).toBe(`

title: This is a note

A header

This is the content.

Another header

This is more content.

Image alt text

1]: Footnote. [A footnote link
`);
  });

  test("strips nothing", () => {
    expect(
      removeMd(exampleNote, {
        stripListLeaders: false,
        gfm: false,
        useImgAltText: false,
      })
    ).toBe(`

title: This is a note

A header

This is the content.

Another header

This is more content.

1]: Footnote. [A footnote link
`);
  });

  test("doesn't strip list leader when list character provided but not stripping", () => {
    expect(
      removeMd(
        `

- List item

- List item

- List item`,
        { listUnicodeChar: "-", stripListLeaders: false }
      )
    ).toBe(`

- List item

- List item

- List item`);
  });

  test("strips list leader when stripping and list character provided", () => {
    expect(
      removeMd(
        `
- List item

- List item

- List item`,
        { listUnicodeChar: "-", stripListLeaders: true }
      )
    ).toBe(`-
List item
-
List item
-
List item`);
  });

  test("doesn't strip gfm", () => {
    expect(removeMd(exampleNote, { gfm: false })).toBe(`

title: This is a note

A header

This is the content.

Another header

This is more content.

1]: Footnote. [A footnote link
`);
  });

  test("img alt", () => {
    expect(removeMd(exampleNote, { useImgAltText: false })).toBe(`

title: This is a note

A header

This is the content.

Another header

This is more content.

1]: Footnote. [A footnote link
`);
  });
});
