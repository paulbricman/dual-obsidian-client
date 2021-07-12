import { Utils } from "../utils";
const { removeMd } = Utils;
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
        expect(removeMd(exampleNote, {
            stripListLeaders: false,
            gfm: false,
            useImgAltText: false,
        })).toBe(`

title: This is a note

A header

This is the content.

Another header

This is more content.

1]: Footnote. [A footnote link
`);
    });
    test("doesn't strip list leader when list character provided but not stripping", () => {
        expect(removeMd(`

- List item

- List item

- List item`, { listUnicodeChar: "-", stripListLeaders: false })).toBe(`

- List item

- List item

- List item`);
    });
    test("strips list leader when stripping and list character provided", () => {
        expect(removeMd(`
- List item

- List item

- List item`, { listUnicodeChar: "-", stripListLeaders: true })).toBe(`-
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNqQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsS0FBSyxDQUFDO0FBRTNCLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQzFCLE1BQU0sV0FBVyxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7OztDQWlCckIsQ0FBQztJQUVBLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Ozs7Ozs7Ozs7Ozs7OztDQWV0QyxDQUFDLENBQUM7SUFDRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxDQUNKLFFBQVEsQ0FBQyxXQUFXLEVBQUU7WUFDcEIsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixHQUFHLEVBQUUsS0FBSztZQUNWLGFBQWEsRUFBRSxLQUFLO1NBQ3JCLENBQUMsQ0FDSCxDQUFDLElBQUksQ0FBQzs7Ozs7Ozs7Ozs7OztDQWFWLENBQUMsQ0FBQztJQUNELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRTtRQUNwRixNQUFNLENBQ0osUUFBUSxDQUNOOzs7Ozs7WUFNSSxFQUNKLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FDbEQsQ0FDRixDQUFDLElBQUksQ0FBQzs7Ozs7O1lBTUMsQ0FBQyxDQUFDO0lBQ1osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1FBQ3pFLE1BQU0sQ0FDSixRQUFRLENBQ047Ozs7O1lBS0ksRUFDSixFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQ2pELENBQ0YsQ0FBQyxJQUFJLENBQUM7Ozs7O1VBS0QsQ0FBQyxDQUFDO0lBQ1YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Ozs7Ozs7Ozs7Ozs7Q0FhdEQsQ0FBQyxDQUFDO0lBQ0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDOzs7Ozs7Ozs7Ozs7O0NBYWhFLENBQUMsQ0FBQztJQUNELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBVdGlscyB9IGZyb20gXCIuLi91dGlsc1wiO1xuY29uc3QgeyByZW1vdmVNZCB9ID0gVXRpbHM7XG5cbmRlc2NyaWJlKFwiYHJlbW92ZU1kYFwiLCAoKSA9PiB7XG4gIGNvbnN0IGV4YW1wbGVOb3RlID0gYFxuLS0tXG50aXRsZTogVGhpcyBpcyBhIG5vdGVcbi0tLVxuXG4jIEEgaGVhZGVyXG5cblRoaXMgaXMgdGhlIGNvbnRlbnQuXG5cbiMjIEFub3RoZXIgaGVhZGVyXG5cblRoaXMgaXMgbW9yZSBjb250ZW50LlxuXG4hW0ltYWdlIGFsdCB0ZXh0XSgvaW1hZ2UucG5nKVxuXG5bMV06IEZvb3Rub3RlLiBbQSBmb290bm90ZSBsaW5rXShodHRwOi8vZXhhbXBsZS5jb20pXG5cbmA7XG5cbiAgdGVzdChcIndvcmtzXCIsICgpID0+IHtcbiAgICBleHBlY3QocmVtb3ZlTWQoZXhhbXBsZU5vdGUpKS50b0JlKGBcblxudGl0bGU6IFRoaXMgaXMgYSBub3RlXG5cbkEgaGVhZGVyXG5cblRoaXMgaXMgdGhlIGNvbnRlbnQuXG5cbkFub3RoZXIgaGVhZGVyXG5cblRoaXMgaXMgbW9yZSBjb250ZW50LlxuXG5JbWFnZSBhbHQgdGV4dFxuXG4xXTogRm9vdG5vdGUuIFtBIGZvb3Rub3RlIGxpbmtcbmApO1xuICB9KTtcblxuICB0ZXN0KFwic3RyaXBzIG5vdGhpbmdcIiwgKCkgPT4ge1xuICAgIGV4cGVjdChcbiAgICAgIHJlbW92ZU1kKGV4YW1wbGVOb3RlLCB7XG4gICAgICAgIHN0cmlwTGlzdExlYWRlcnM6IGZhbHNlLFxuICAgICAgICBnZm06IGZhbHNlLFxuICAgICAgICB1c2VJbWdBbHRUZXh0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgKS50b0JlKGBcblxudGl0bGU6IFRoaXMgaXMgYSBub3RlXG5cbkEgaGVhZGVyXG5cblRoaXMgaXMgdGhlIGNvbnRlbnQuXG5cbkFub3RoZXIgaGVhZGVyXG5cblRoaXMgaXMgbW9yZSBjb250ZW50LlxuXG4xXTogRm9vdG5vdGUuIFtBIGZvb3Rub3RlIGxpbmtcbmApO1xuICB9KTtcblxuICB0ZXN0KFwiZG9lc24ndCBzdHJpcCBsaXN0IGxlYWRlciB3aGVuIGxpc3QgY2hhcmFjdGVyIHByb3ZpZGVkIGJ1dCBub3Qgc3RyaXBwaW5nXCIsICgpID0+IHtcbiAgICBleHBlY3QoXG4gICAgICByZW1vdmVNZChcbiAgICAgICAgYFxuXG4tIExpc3QgaXRlbVxuXG4tIExpc3QgaXRlbVxuXG4tIExpc3QgaXRlbWAsXG4gICAgICAgIHsgbGlzdFVuaWNvZGVDaGFyOiBcIi1cIiwgc3RyaXBMaXN0TGVhZGVyczogZmFsc2UgfVxuICAgICAgKVxuICAgICkudG9CZShgXG5cbi0gTGlzdCBpdGVtXG5cbi0gTGlzdCBpdGVtXG5cbi0gTGlzdCBpdGVtYCk7XG4gIH0pO1xuXG4gIHRlc3QoXCJzdHJpcHMgbGlzdCBsZWFkZXIgd2hlbiBzdHJpcHBpbmcgYW5kIGxpc3QgY2hhcmFjdGVyIHByb3ZpZGVkXCIsICgpID0+IHtcbiAgICBleHBlY3QoXG4gICAgICByZW1vdmVNZChcbiAgICAgICAgYFxuLSBMaXN0IGl0ZW1cblxuLSBMaXN0IGl0ZW1cblxuLSBMaXN0IGl0ZW1gLFxuICAgICAgICB7IGxpc3RVbmljb2RlQ2hhcjogXCItXCIsIHN0cmlwTGlzdExlYWRlcnM6IHRydWUgfVxuICAgICAgKVxuICAgICkudG9CZShgLVxuTGlzdCBpdGVtXG4tXG5MaXN0IGl0ZW1cbi1cbkxpc3QgaXRlbWApO1xuICB9KTtcblxuICB0ZXN0KFwiZG9lc24ndCBzdHJpcCBnZm1cIiwgKCkgPT4ge1xuICAgIGV4cGVjdChyZW1vdmVNZChleGFtcGxlTm90ZSwgeyBnZm06IGZhbHNlIH0pKS50b0JlKGBcblxudGl0bGU6IFRoaXMgaXMgYSBub3RlXG5cbkEgaGVhZGVyXG5cblRoaXMgaXMgdGhlIGNvbnRlbnQuXG5cbkFub3RoZXIgaGVhZGVyXG5cblRoaXMgaXMgbW9yZSBjb250ZW50LlxuXG4xXTogRm9vdG5vdGUuIFtBIGZvb3Rub3RlIGxpbmtcbmApO1xuICB9KTtcblxuICB0ZXN0KFwiaW1nIGFsdFwiLCAoKSA9PiB7XG4gICAgZXhwZWN0KHJlbW92ZU1kKGV4YW1wbGVOb3RlLCB7IHVzZUltZ0FsdFRleHQ6IGZhbHNlIH0pKS50b0JlKGBcblxudGl0bGU6IFRoaXMgaXMgYSBub3RlXG5cbkEgaGVhZGVyXG5cblRoaXMgaXMgdGhlIGNvbnRlbnQuXG5cbkFub3RoZXIgaGVhZGVyXG5cblRoaXMgaXMgbW9yZSBjb250ZW50LlxuXG4xXTogRm9vdG5vdGUuIFtBIGZvb3Rub3RlIGxpbmtcbmApO1xuICB9KTtcbn0pO1xuIl19