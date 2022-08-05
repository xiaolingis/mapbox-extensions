# mapbox-extensions [中文](./README.ZH.md)
[![npm](https://img.shields.io/npm/v/mapbox-extensions)](https://www.npmjs.com/package/mapbox-extensions)  
extension of mapbox, like changeStyle instead of setStyle to preserve added-layer, define custom layer-group and operate layer with group. etc...
## dev & build 
```
yarn
yarn dev
yarn build
```
## usage  
1. make sure mapbox installed. 
2. `npm install` / `yarn add` `mapbox-extensions`. 
3. add `import 'mapbox-extensions'` at your entry file. 
4. enjoy extensions. 
## features 
### `changeStyle`  
map.setStyle(...) will clear all sources and layers, use changeStyle can preserve sources and layers, but you must indicates layer ids
``` ts
const map = new mapboxgl.Map({...});
map.changeStyle(["layer-polygon","xxxlayer"] , options);
```

### `Layer Group`
``` ts
const map = new mapboxgl.Map({...});
const group = map.addLayerGroup('group1');

group.add(layer); // add a layer to group, it will add to map automatically
group.show = false; // all layers in this group will be unvisible
group.show = true;

console.log(group.layerIds); // ['layerid']

group.remove('layerid');
group.removeAll();

map.removeLayerGroup('group1');
```  
### `Measure`  
a measure control implements mapboxgl.IControl, you can measure point(lng,lat), line(distance), polygon(area) with it. 

``` ts
const map = new mapboxgl.Map({...});

map.addControl(new MeasureControl(options)) // options can be null
```
*args*  
[MeasureControlOptions](./lib/controls/MeasureControl.ts)  
[MeasurePointOptions](./lib/features/Meature/MeasurePoint.ts)  
[MeasureLineStringOptions](./lib/features/Meature/MeasureLineString.ts)  
[MeasurePolygonOptions](./lib/features/Meature/MeasurePolygon.ts)  

you can also config custom ui with this three class of measure， you can find all public functions in [MeasureBase](./lib/features/Meature/MeasureBase.ts), custom is so easy.