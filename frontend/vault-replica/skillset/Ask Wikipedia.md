---
- query: Search Wikipedia for the director of Insterstellar
  entity: Interstellar
  property: director
- query: Now search Wikipedia for the budget of Ender's Game
  entity: Ender's Game
  property: budget
- query: Search Wikipedia for the theme of Pulp Fiction
  entity: Pulp Fiction
  property: theme
- query: Now search Wikipedia for the designer of Python
  entity: Python
  property: designer
- query: Search Wikipedia for the runtime of The Godfather
  entity: The Godfather
  property: runtime
- query: Now search Wikipedia for the main subject of Rick and Morty
  entity: Rick and Morty
  property: main subject
- query: Search wikipedia for the release date of Macbook Air
  entity: Macbook Air
  property: release date
- query: Search Wikipedia for the genre of Inception
  entity: Inception
  property: genre
---

```js
(async () => {  
  let url = new URL("https://www.wikidata.org/w/api.php")
  let params = {
    action: "wbsearchentities",
    language: "en",
    format: "json",
    origin: "*",
	search: "*entity*"
  }

  url.search = new URLSearchParams(params).toString();
  const entityResponse = await fetch(url)
  const entityResponseJSON = await entityResponse.json();
  const entityID = entityResponseJSON["search"][0]["id"]
  
  params["search"] = "*property*"
  params["type"] = "property"
  
  url.search = new URLSearchParams(params).toString();
  const propertyResponse = await fetch(url)
  const propertyResponseJSON = await propertyResponse.json();
  const propertyID = propertyResponseJSON["search"][0]["id"];
  
  console.log(entityID, propertyID)
  
  url = new URL("https://query.wikidata.org/sparql")
  params = {
    query: "SELECT ?answerLabel WHERE { wd:" + entityID + " wdt:" + propertyID + ' ?answer SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }}',
	format: "json"
  }
  
  url.search = new URLSearchParams(params).toString();
  const finalResponse = await fetch(url)
  const finalResponseJSON = await finalResponse.json();
  
  console.log(finalResponseJSON)
  return finalResponseJSON["results"]["bindings"][0]["answerLabel"]["value"]
  
  //return "".concat(finalResponse["results"]["bindings"]).reduce((acc, e) => { return acc + e["answerLabel"]["value"] + "; " })
})();
```