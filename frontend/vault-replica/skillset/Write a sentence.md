---
- command: Write a sentence based on " ___ "
- command: Come up with a sentence starting with " ___ "
- command: Formulate one sentence starting with " ___ "
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
			"behavior": "finish_sentence"
		})
	});

	var content = await rawResponse.json();
	return content["result"][0];
})();
```