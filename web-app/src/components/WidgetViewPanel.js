
import React from 'react';
import axios from 'axios';

import ReactTable from 'react-table';
import 'react-table/react-table.css';


import GridLayout from './GridLayout';
import * as Util from '../api/Util';


const BASE_WIDTH = 1200;

class WidgetViewPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      widgets: [],
      gridWidth: 1200,
      height: 600,
      snapToGrid: false,
      showGridlines: true
    };
  }

  componentDidMount() {
  }

  resizeGrid = (width, isResizeToBase) => {
    const preGridWidth = this.state.gridWidth;
    const { widgets } = this.state;
    const newWidgets = [...widgets];
    if (isResizeToBase) {
      this.resizeWidgetsToBase(newWidgets, preGridWidth);
    }

    const gridWidth = width - 20;
    this.resizeWidgetsToActual(newWidgets, gridWidth);
    this.setState({
      widgets: newWidgets,
      gridWidth: gridWidth
    });
  }

  resizeWidgetsToBase = (widgets, gridWidth) => {
    for (let i = 0; i < widgets.length; i++) {
      const baseX = this.scaleToBase(widgets[i].x, gridWidth);
      const baseWidth = this.scaleToBase(widgets[i].width, gridWidth);
      widgets[i].x = baseX;
      widgets[i].width = baseWidth;
    }
  }

  resizeWidgetsToActual = (widgets, gridWidth) => {
    for (let i = 0; i < widgets.length; i++) {
      const actualX = this.scaleToActual(widgets[i].x, gridWidth);
      const actualdWidth = this.scaleToActual(widgets[i].width, gridWidth);
      widgets[i].x = actualX;
      widgets[i].width = actualdWidth;
    }
  }

  scaleToActual = (num, gridWidth) => {
    return Math.round(num * gridWidth / BASE_WIDTH);
  }

  scaleToBase = (num, gridWidth) => {
    return Math.round(num * BASE_WIDTH / gridWidth);
  }

  fetchWidgets = (dashboardId, width, filterParams) => {
    if (dashboardId === null) {
      return;
    }
    axios.get('/ws/widget/dashboard/' + dashboardId)
      .then(res => {
        const result = res.data;
        this.setState({
          widgets: result
        }, () => {
          this.resizeGrid(width, false);
          this.queryWidgets(filterParams);
        });
      });
  }

  queryWidgets = (filterParams) => {
    const params = filterParams === null ? [] : filterParams;
    const { widgets } = this.state;
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      axios.post('/ws/jdbcquery/widget/' + widget.id, params)
        .then(res => {
          const result = res.data;
          const index = widgets.findIndex(w => w.id === result.id);
          const newWidgets = [...widgets];
          newWidgets[index].queryResult = JSON.parse(result.data);
          this.setState({
            widgets: newWidgets
          });
        });
    }
  }

  handleInputChange = (event) => {
    this.setState({
      [event.target.name]: event.target.value
    });
  }

  saveWidgets = () => {
    const newWidgets = JSON.parse(JSON.stringify(this.state.widgets));
    const { gridWidth } = this.state;
    this.resizeWidgetsToBase(newWidgets, gridWidth);
    axios.post('/ws/widget/position', newWidgets)
      .then(res => {
      });
  }

  onWidgetMove = (widget) => {
    const { widgets } = this.state;
    const index = widgets.findIndex(w => w.id === widget.id);
    const newWidgets = [...widgets];
    newWidgets[index].x = widget.x;
    newWidgets[index].y = widget.y;
    newWidgets[index].width = widget.width;
    newWidgets[index].height = widget.height;
    this.setState({
      widgets: newWidgets
    });
  }

  onWidgetRemove = (widgetId) => {
    axios.delete('/ws/widget/' + widgetId)
      .then(res => {
        const { widgets } = this.state;
        const index = widgets.findIndex(w => w.id === widgetId);
        const newWidgets = [...widgets];
        newWidgets.splice(index, 1);
        this.setState({
          widgets: newWidgets
        });
      });
  }

  render() {
    const { widgetViewWidth } = this.props;
    const style = {
      width: widgetViewWidth + 'px'
    }

    return (
      <div className="dashboard-content-widget-panel" style={style}>

        {this.props.isEditMode ?
        (
          <div>
            <input 
            type="checkbox" 
            name="snapToGrid"
            value="snapToGrid"
            checked={this.state.snapToGrid} 
            onChange={this.handleInputChange} />
            snapToGrid
            <br/>
            <input 
              type="checkbox" 
              name="showGridlines"
              value="showGridlines"
              checked={this.state.showGridlines} 
              onChange={this.handleInputChange} />
              showGridlines
            <br/>
          </div>
        ) : null}
        
        <GridLayout 
          width={this.state.gridWidth}
          height={this.props.height}
          snapToGrid={this.state.snapToGrid}
          showGridlines={this.state.showGridlines}
          widgets={this.state.widgets}
          isEditMode={this.props.isEditMode}
          onWidgetMove={this.onWidgetMove}
          onWidgetEdit={this.props.onWidgetEdit} 
          onWidgetRemove={this.onWidgetRemove} />
      </div>
    )
  };
}

export default WidgetViewPanel;