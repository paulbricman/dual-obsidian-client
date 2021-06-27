---
- command: Write a sentence based on ""
- command: Write a sentence which starts with ""
- command: Write one sentence which starts with ""
---

```js
(async () => {
    var prompt = RegExp(/"[\s\S]*"/g).exec(`*command*`)[0]
    prompt = prompt.substring(1, prompt.length - 1)
	prompt = prompt.trimRight()
	
	const rawResponse = await fetch("http://127.0.0.1:3030/generate/", {
		"method": "POST",
		"headers": {
			"Accept": "application/json",
			"Content-Type": "application/json",
		},
		"body": JSON.stringify({
			"prompt": prompt,
			"generate_sentences": 1,
			"generate_paragraphs": 1
		})
	});

	var content = await rawResponse.json();
	return content["output"][0];
})();
```