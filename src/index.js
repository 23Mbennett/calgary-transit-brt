
import React from 'react';
import ReactDOM from 'react-dom';
import './styles.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl'
import max_lines from './max_lines.json'
import max_stops from './max_stops.json'
import { bbox } from '@turf/turf'

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
      zoom: 11,
      max_route: '17_ave',
      stop_name: "",
      connections: [],
      bus_query: null,
      active_route: null,
      active_conn: null
    };
  }

  componentDidMount() {

    const {lng, lat, zoom } = this.state;
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/saadiqm/cjbjougmt08z72rsa7me1duoi',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 13,
      minZoom: 10.5,
    });

    this.map.on('load', () => {

      let geojson = 'https://data.calgary.ca/resource/hpnd-riq4.geojson?route_short_name='+this.state.bus_query+'&$select=multiline'

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
                "line-width": 10,
                "line-opacity": 0.3
            },
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "filter": ["==", "route_name", layer_name]
        });

      });

      this.map.addLayer({
          "id": "Bus Route",
          "type": "line",
          "source": 'Bus Route',
          "paint": {
              "line-color": "red",
              "line-width": 4,
              "line-opacity": 0.4
          },
          "layout": {
              "line-join": "round",
              "line-cap": "round"
          },
      });

      this.map.addLayer({
          "id": "Max Stops",
          "type": "circle",
          "source": 'Max Stops',
          "paint": {
              "circle-color": "white",
              'circle-radius':9,
              "circle-opacity": 0.6
          },
          "filter": ["==", "route_name", '']
      });

      this.map.addLayer({
          "id": "Selected Stop",
          "type": "circle",
          "source": 'Max Stops',
          "paint": {
              "circle-color": "white",
              'circle-radius':11,
              "circle-opacity": 1.0
          },
          "filter": ["==", "stop_name", '']
      });


    });

    this.popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'bottom-left',
            offset: [5,-20]
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
    max_lines.features.forEach((feature)=>{
      let layer_name = feature.properties.route_name

      if(layer_name===value){
        this.map.setPaintProperty(value, 'line-opacity', 1);
        this.map.setFilter('Max Stops',['==', 'route_name', value])

        let bounds= bbox(feature.geometry);

        if(this.map.getPaintProperty(value, 'line-opacity') === 1){
          this.map.fitBounds(bounds, {
            padding: {top: 50, bottom:50, left: 50, right: 50}
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

  connections(index, e){

    e.preventDefault();
    let value = e.target.getAttribute('value')
    this.setState({ active_conn: index });

    this.setState({bus_query: value}, () => { //update selected bus route
      let geojson = 'https://data.calgary.ca/resource/hpnd-riq4.geojson?route_short_name='+this.state.bus_query+'&$select=multiline'

      fetch(geojson)
        .then(response => {
            return response.json();
        }).then(data => {

          try{
            let bounds= bbox(data); //find bounding box using Turf
            this.map.fitBounds(bounds, {
              padding: {top: 100, bottom:100, left: 100, right: 100}
            });
            this.errordiv()
          }
          catch(error) {
            this.errordiv(<div className="bus_select">This bus route is not available</div>)
          }
        });

      this.map.getSource('Bus Route').setData(geojson);
      this.map.setLayoutProperty('Bus Route', 'visibility', 'visible');

    })

  }

  handle(index, e){
    e.preventDefault();

    this.setState({ active_route: index, active_conn:null,bus_query: null, connections:[], stop_name:'' });

    let value = e.target.getAttribute('value')

    this.toggle_layer(value)
    this.map.setLayoutProperty('Bus Route', 'visibility', 'none');
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
          output = <span style={{marginRight:"5px"}} onClick={this.connections.bind(this, index)} value={x} key={x}>{x}</span>
        }
        return output
      });

      let text = <div>{this.state.stop_name}<br/> <span style={{fontWeight:'lighter', fontSize:'14px', cursor: 'pointer'}}>{routeConnections}</span></div>

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

      return  <li style={{marginBottom: '10px'}}className={this.state.active_route===index ? 'route_list': 'route_select'} onClick={this.handle.bind(this, index)} value ={value} key={value}>{label}  <hr style={line_style} /></li>



    });

    let routeConnections = this.state.connections.map((x, index) => {
      let output
      if(x==="null"){
        output = <span className='bus_select' value={x} key={x}>No Connections</span>
      }else{
        output = <span className={this.state.active_conn===index ? 'bus_list': 'bus_select'} onClick={this.connections.bind(this, index)} value={x} key={x}>{x}</span>
      }
      return output
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
          <br/>

          <h2>{this.state.stop_name}</h2>
            <div style = {{textAlign: 'center'}}>
              {routeConnections}
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
