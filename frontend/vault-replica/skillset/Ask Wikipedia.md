---
- query: Who was the director of Insterstellar?
  entity: Interstellar
  property: director
- query: What was the budget of Ender's Game?
  entity: Ender's Game
  property: budget
- query: What is the theme for Pulp Fiction?
  entity: Pulp Fiction
  property: theme
- query: What is the runtime of The Godfather?
  entity: The Godfather
  property: runtime
---

```js
(async () => {  
  var entityResponse = await fetch("https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Interstellar&language=en&format=json&origin=*")
  
  console.log(entityResponse)
  var content = await entityResponse.json();
  console.log(content)
})();
```