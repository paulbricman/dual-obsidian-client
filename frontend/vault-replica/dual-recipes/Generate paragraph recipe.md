---
examples:
  - "Generate a paragraph based on \"something\"."
  - "Come up with a paragraph based on \"some text\""
  - "Generate one paragraph based on \"The ultimate answer is:\""
output: "#1"
---

```js
const rawResponse = await fetch("http://127.0.0.1:5000/generate/", {
	method: "POST",
	headers: {
		"Accept": "application/json",
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		"prompt": "*quoted content*",
		"early_stopping_criterion": "finish_paragraph",
		"max_generated_token_count": "*quoted content*".length,
	}),
});

var content = await rawResponse.json();
content = content["output"][0];
content
```