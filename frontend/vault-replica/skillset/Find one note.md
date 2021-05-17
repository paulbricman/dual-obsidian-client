---
- command: Find a single note about something.
- command: Get one note about "a subject"!
- command: Search for a single note on something.
- result: "#1"
---

```js
(async () => {
	const rawResponse = await fetch("http://127.0.0.1:5000/extract/", {
		"method": "POST",
		"headers": {
			"Accept": "application/json",
			"Content-Type": "application/json",
		},
		"body": JSON.stringify({
			"query": "*topic*",
			"documents": await getNotes(app),
			"selected_candidates": 1,
			"return_documents": true
		})
	});

	var content = await rawResponse.json();
	return content["result"].join('\n\n');
})();
```