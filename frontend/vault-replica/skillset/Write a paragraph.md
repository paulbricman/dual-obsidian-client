---
- command: Write a paragraph based on ""
- command: Come up with a paragraph starting with ""
- command: Formulate one paragraph starting with ""
---

```js
(async () => {
    var prompt = RegExp(/"[\s\S]*"/g).exec(`*command*`)[0]
    prompt = prompt.substring(1, prompt.length - 1)
	prompt = prompt.trimRight()
	
	const rawResponse = await fetch("http://127.0.0.1:5000/generate/", {
		"method": "POST",
		"headers": {
			"Accept": "application/json",
			"Content-Type": "application/json",
		},
		"body": JSON.stringify({
			"prompt": prompt,
			"behavior": "finish_paragraph"
		})
	});

	var content = await rawResponse.json();
	return content["result"][0];
})();
```