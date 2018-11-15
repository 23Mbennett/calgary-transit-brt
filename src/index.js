
import React from 'react';
import ReactDOM from 'react-dom';
import './styles.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl'
import max_lines from './max_lines.json'
import max_stops from './max_stops.json'
import { bbox } from '@turf/turf'
import symbol from './symbol_background.png';

let route_dict = {
  '17_Ave': "MAX PURPLE",
  "south_cross": 'MAX TEAL',
  'north_cross': 'MAX ORANGE'
};

let route_color = {
  '17_Ave': "purple",
  "south_cross": 'teal',
  'north_cross': 'orange'
};

mapboxgl.accessToken = 'pk.eyJ1Ijoic2FhZGlxbSIsImEiOiJjamJpMXcxa3AyMG9zMzNyNmdxNDlneGRvIn0.wjlI8r1S_-xxtq2d-W5qPA';

class Application extends React.Component {

  constructor(props) {
    super(props);
    this.handle = this.handle.bind(this)
    this.errordiv = this.errordiv.bind(this)
    this.connections = this.connections.bind(this)
    this.toggle_layer = this.toggle_layer.bind(this)
    this.state = {
      lng: -114.0708,
      lat: 51.0486,
      zoom: 10.7,
      max_route: '17_ave',
      stop_name: "",
      connections: [],
      bus_query: null,
      active_route: null,
      active_conn: null,
      height:props.height,
      width: props.width
    };
  }

  componentWillMount(){
    this.setState({height: window.innerHeight,width:window.innerWidth});

  }

  componentDidMount() {

    const {lng, lat, zoom} = this.state;
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/saadiqm/cjbjougmt08z72rsa7me1duoi',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 13,
      minZoom: 10,
      transformRequest: (url, resourceType) => {
         if(resourceType === 'Source' && url.startsWith('https://04lkhtx0r2')) {
           return {
            url: url,
            credentials: "omit"
          }
         }
       }
    });

    this.map.on('load', () => {

      let layers = this.map.getStyle().layers;
      // Find the index of the first symbol layer in the map style
      let firstSymbolId;
      for (let i = 0; i < layers.length; i++) {
          if (layers[i].type === 'symbol') {
              firstSymbolId = layers[i].id;
              break;
          }
      }


      let geojson = 'https://xxtg9c00w7.execute-api.us-west-2.amazonaws.com/dev/shapes/'+String(this.state.bus_query)

      this.map.addSource('Bus Route', {
        type: 'geojson',
        data: geojson
      });

      this.map.addSource('Max Routes', {
        type: 'geojson',
        data: max_lines
      });
      this.map.addSource('Max Stops', {
        type: 'geojson',
        data: max_stops
      });
      this.map.addSource('201', {
        type: 'geojson',
        data: 'https://xxtg9c00w7.execute-api.us-west-2.amazonaws.com/dev/shapes/201'
      });
      this.map.addSource('202', {
        type: 'geojson',
        data: 'https://xxtg9c00w7.execute-api.us-west-2.amazonaws.com/dev/shapes/202'
      });

      this.map.addLayer({
          "id": "201",
          "type": "line",
          "source": '201',
          "paint": {
              "line-color": "red",
              "line-width": 4,
              "line-opacity": 0.2
          },
          "layout": {
              "line-join": "round",
              "line-cap": "round"
          },
      }, firstSymbolId);

      this.map.addLayer({
          "id": "202",
          "type": "line",
          "source": '202',
          "paint": {
              "line-color": "#003a99",
              "line-width": 4,
              "line-opacity": 0.2
          },
          "layout": {
              "line-join": "round",
              "line-cap": "round"
          },
      }, firstSymbolId);

      max_lines.features.map((feature)=>{
        let layer_name = feature.properties.route_name
        return this.map.addLayer({
            "id": layer_name,
            "type": "line",
            "source": 'Max Routes',
            "paint": {
                "line-color": [
                  'match',
                  ['get', 'route_name'],
                  'south_cross', 'teal',
                  'north_cross', 'orange',
                  '17_Ave', 'purple',
                  'blue'
                ],
                "line-width": 7,
                "line-opacity": 0.6
            },
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "filter": ["==", "route_name", layer_name]
        }, firstSymbolId);

      },'road_label_large');

      this.map.addLayer({
          "id": "Bus Route",
          "type": "line",
          "source": 'Bus Route',
          "paint": {
              "line-color": "red",
              "line-width": 5,
              "line-opacity": 0.9
          },
          "layout": {
              "line-join": "round",
              "line-cap": "round"
          },
      }, firstSymbolId);

      this.map.addLayer({
          "id": "Max Stops",
          "type": "circle",
          "source": 'Max Stops',
          "paint": {
              "circle-color": "white",
              'circle-radius':{
                  stops: [[8, 4], [11, 6], [16, 20]]
              },
              "circle-opacity": 0.7
          },
          "filter": ["==", "route_name", '']
      });

      this.map.addLayer({
          "id": "Selected Stop",
          "type": "circle",
          "source": 'Max Stops',
          "paint": {
              "circle-color": "white",
              'circle-radius':{
                stops: [[8, 4], [11, 6], [16, 20]]
              },
              "circle-opacity": 0.9,
              "circle-stroke-width": 4,
              "circle-stroke-color": '#a5a5a5'
          },
          "filter": ["==", "stop_name", '']
      });


      let img = new Image(27,27)
      img.onload = ()=> this.map.addImage('bus', img)
      img.src = symbol

      this.map.addLayer({
          "id": "symbols",
          "type": "symbol",
          "source": "Bus Route",
          "layout": {
            "icon-image": "bus",
            "icon-text-fit":'none',
            "icon-text-fit-padding":[3,3,3,3],
            "symbol-placement":  "line",
            'symbol-spacing':1000,
            'icon-rotation-alignment': 'viewport',
            'text-rotation-alignment':'viewport',
            "text-field": String(this.state.bus_query), // part 2 of this is how to do it
            "text-size": 12,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-transform": "uppercase",
            "text-letter-spacing": 0.05,
            "text-offset": [0, 0]
          },
          "paint": {
              "text-color": "red"
          }
      });

    });



    this.popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: true,
            anchor: 'bottom-left',
            offset: [10,-15]
    });

    this.map.on('mouseover',"Max Stops",this.stops.bind(this));

    max_lines.features.forEach((feature)=>{
      let layer_name = feature.properties.route_name
      this.map.on('mouseenter',layer_name, this.over.bind(this));
      this.map.on('mouseleave', layer_name, this.leave.bind(this));
      this.map.on('click', layer_name, this.click.bind(this));
    });

  }

  toggle_layer(value){

    let pad = {}
    if (this.state.width<500){
      pad ={top:this.state.height*0.4, bottom: 15, left:15, right:15};
    } else {
      pad ={top:this.state.height*0.1, bottom:this.state.height*0.1, left:this.state.width*0.3, right:this.state.height*0.1};
    }

    max_lines.features.forEach((feature)=>{
      let layer_name = feature.properties.route_name

      if(layer_name===value){
        this.map.setPaintProperty(value, 'line-opacity', 1);
        this.map.setFilter('Max Stops',['==', 'route_name', value])

        let bounds= bbox(feature.geometry);

        if(this.map.getPaintProperty(value, 'line-opacity') === 1){
          this.map.fitBounds(bounds, {
            padding: {top: pad.top, bottom:pad.bottom, left: pad.left, right: pad.right}
          });
        }
      }else{
        this.map.setPaintProperty(layer_name, 'line-opacity', 0.4);
      }

    });
  }

  errordiv(output=<div></div>){
    const placeholder = document.getElementById("error");
    let text = output
    ReactDOM.render(text, placeholder);
  }

  handle(index, e){
    e.preventDefault();

    this.setState({ active_route: index, active_conn:null,bus_query: null, connections:[], stop_name:'' });

    let value = e.target.getAttribute('value')

    this.toggle_layer(value)
    this.map.setLayoutProperty('Bus Route', 'visibility', 'none');
    this.map.setLayoutProperty('symbols', 'visibility', 'none');
    this.popup.remove()

    this.errordiv()

  }

  click(e){
    e.preventDefault();
    let value = e.features[0].properties.route_name

    let route = []
    max_lines.features.forEach(x => route.push(x.properties.route_name))
    let index = route.indexOf(value)

    this.setState({ active_route: index, active_conn:null, bus_query: null});
    this.toggle_layer(value)
    this.map.setLayoutProperty('Bus Route', 'visibility', 'none');
    this.map.setLayoutProperty('symbols', 'visibility', 'none');

    this.errordiv()

  }

  over(e){
    let route = e.features[0].properties.route_name
    this.map.getCanvas().style.cursor = 'pointer';
    if(this.map.getPaintProperty(route, 'line-opacity') !== 1){
      this.map.setPaintProperty(route, 'line-opacity', 0.8);
    }
  }

  leave(e){
    this.map.getCanvas().style.cursor = '';
    max_lines.features.forEach((feature)=>{
      let route = feature.properties.route_name
      if(this.map.getPaintProperty(route, 'line-opacity') !== 1){
        this.map.setPaintProperty(route, 'line-opacity', 0.4);
      }
    });
  }

  connections(x, e){
    e.preventDefault();

    let pad = {}
    if (this.state.width<500){
      pad ={top:this.state.height*0.4, bottom: 15, left:15, right:15};
    } else {
      pad ={top:this.state.height*0.1, bottom:this.state.height*0.1, left:this.state.width*0.3, right:this.state.height*0.1};
    }

    this.setState({bus_query: x.trim()}, () => { //update selected bus route

      let demoId = document.querySelectorAll('#bus_node');
      demoId.forEach(element => {
        if(this.state.bus_query===element.textContent.trim()){
          element.classList.replace('bus_select2','bus_list2')
        }else{
          element.classList.replace('bus_list2','bus_select2')
        }
      });

      let geojson = 'https://xxtg9c00w7.execute-api.us-west-2.amazonaws.com/dev/shapes/'+this.state.bus_query

      this.map.setLayoutProperty('symbols', 'text-field', String(this.state.bus_query))

      fetch(geojson)
        .then(response => {
            return response.json();
        }).then(data => {

          try{
            let bounds= bbox(data); //find bounding box using Turf
            this.map.fitBounds(bounds, {
              padding: {top: pad.top, bottom:pad.bottom, left: pad.left, right: pad.right}
            });
            this.errordiv()
          }
          catch(error) {
            this.errordiv(<h3>Cannot show this bus route</h3>)
          }
        });

      this.map.getSource('Bus Route').setData(geojson);
      this.map.setLayoutProperty('Bus Route', 'visibility', 'visible');
      this.map.setLayoutProperty('symbols', 'visibility', 'visible');

    })

  }

  stops(e){

    let f = this.map.queryRenderedFeatures(e.point, { layers: ['Max Stops'] });
    this.setState({ active_conn: null });

    if(f.length > 0){
      this.setState({
        stop_name:f[0].properties.stop_name,
        connections:f[0].properties.connection.split(',')
      });

      this.map.setFilter('Selected Stop',['==', 'stop_name', this.state.stop_name])

      let routeConnections = this.state.connections.map((x, index) => {
        let output
        if(x==="null"){
          output = <span value={x} key={x}>No Connections</span>
        }else{

          output = <span id="bus_node" className='bus_select2' onClick={this.connections.bind(this, x)} value={x} key={x}>{x}</span>

        }
        return output
      });

      let text = <div><h2>{this.state.stop_name}</h2>{routeConnections}</div>

      const placeholder = document.createElement('div');
      ReactDOM.render(text, placeholder);

      this.popup.setLngLat(f[0].geometry.coordinates).setDOMContent(placeholder).addTo(this.map);
    }

  }

  render() {

    let max_routes = max_lines.features.map((x, index) => {

      let value = x.properties.route_name;
      let label = route_dict[x.properties.route_name]

      const line_style = {height:'3px', background:route_color[x.properties.route_name],  borderRadius:'8px'}

      return  <li style={{marginBottom: '10px'}} className={this.state.active_route===index ? 'route_list': 'route_select'} onClick={this.handle.bind(this, index)} value ={value} key={value}>{label}  <hr style={line_style} /></li>



    });


    return (
      <div>
        <div ref={el => this.mapContainer = el} className="absolute top right left bottom" />

        <div className="border_box">

          <h1>CALGARY TRANSIT BRT SYSTEM MAP</h1>

          <div>
            <ul>
              {max_routes}
            </ul>
          </div>

          <div id="error"></div>

          <div className='byline'>
            <h4>&copy;2018 Saadiq Mohiuddin <a href="https://www.twitter.com/saadiqmohiuddin">@saadiqmohiuddin</a></h4>
          </div>


        </div>
      </div>

    );
  }
}
ReactDOM.render(<Application />, document.getElementById('root'));
