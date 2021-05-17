---
- command: List notes about evolution.
  topic: evolution
- command: Enumerate notes about "What is life?"!
  topic: life
- command: Search for personal notes on virtual assistants.
  topic: virtual assistants
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