---
- command: Find one note about evolution.
  topic: evolution
- command: Find a single note about "What is life?"!
  topic: life
- command: Find one personal note on virtual assistants.
  topic: virtual assistants
---

```js
(async () => {
    const notes = await this.getNotes();
    const rawResponse = await fetch("http://127.0.0.1:3030/search/", {
		"method": "POST",
		"headers": {
			"Accept": "application/json",
			"Content-Type": "application/json",
		},
		"body": JSON.stringify({
			"prompt": "*topic*",
			"context": notes
		})
	});

	var content = await rawResponse.json();
	return notes[content["output"][0]];
})();
```