---
- command: List notes about something.
- command: Enumerate notes about "a subject"!
- command: Search for personal notes on something.
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
			"selected_candidates": 3,
			"return_documents": true
		})
	});

	var content = await rawResponse.json();
	return content["result"].join('\n\n');
})();
```