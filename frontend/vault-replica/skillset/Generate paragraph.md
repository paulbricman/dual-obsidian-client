---
- command: Generate a paragraph based on "something"
- command: Come up with a paragraph based on "some text"
- command: Generate one paragraph based on "The answer is "
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