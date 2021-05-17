---
- command: Get one note about evolution.
  topic: evolution
- command: Find a note about "What is life?"
  topic: life
- command: Search for one note on virtual assistants.
  topic: virtual assistants
- command: Find one note about physics
  topic: physics
- command: Search for a note about autonomic arousal
  topic: autonomic arousal
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