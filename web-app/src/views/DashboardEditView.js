
import React from 'react';
import ReactDOM from 'react-dom';
import { withRouter } from 'react-router-dom';

import FilterViewPanel from '../components/FilterViewPanel';
import WidgetViewPanel from '../components/WidgetViewPanel';
import WidgetEditPanel from '../components/WidgetEditPanel';
import FilterEditPanel from '../components/FilterEditPanel';
import ColorPicker from '../components/ColorPicker';
import Modal from '../components/Modal';

import * as Constants from '../api/Constants';

import './Dashboard.css';

import * as webApi from '../api/WebApi';
import axios from 'axios';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


class DashboardEditView extends React.Component {

  constructor(props) {
    super(props);
    
    this.state = {
      showWidgetEditPanel: false,
      showFilterEditPanel: false,
      showFilterViewPanel: true,
      isEditMode: false,
      isReadOnly: false,
      autoRefreshTimerId: '',
      lastRefreshed: '',
      jdbcDataSourceOptions: [],
      dashboardId: 0,
      name: '',
      height: 0,
      widgetViewWidth: 1000
    }

    this.filterViewPanel = React.createRef();
    this.filterEditPanel = React.createRef();
    this.widgetViewPanel = React.createRef();
    this.widgetEditPanel = React.createRef();
  }

  componentDidMount() {
    let id = this.props.match.params.id;
    const dashboardId = id !== undefined ? id : null;
    console.log('DashboardEditView', dashboardId);

    const url = this.props.location.search;
    console.log('url', url);
    const params = new URLSearchParams(url);
    console.log('params', params);

    const pageWidth = this.getPageWidth();
    const widgetViewWidth = this.state.showFilterViewPanel ? pageWidth - Constants.DEFAULT_FILTER_VIEW_WIDTH : pageWidth;
    console.log('componentDidMount', pageWidth, widgetViewWidth);
    this.setState({
      pageWidth: pageWidth,
      widgetViewWidth: widgetViewWidth
    }, () => {
      if (dashboardId === null) {
        this.setState({
          dashboardId: null
        });
      } else {
        axios.get(`/ws/dashboard/${dashboardId}`)
          .then(res => {
            const result = res.data;
            this.setState({
              dashboardId: result.id,
              name: result.name,
              height: result.height,
            }, () => {
              this.refresh();
            });
          });
      }
    });
  }

  componentWillUnmount() {
    const { autoRefreshTimerId } = this.state;
    if (autoRefreshTimerId) {
      clearInterval(autoRefreshTimerId);
    }
  }

  loadViewByDashboardName = (dashboardName) => {
    const pageWidth = this.getPageWidth();
    const widgetViewWidth = this.state.showFilterViewPanel ? pageWidth - Constants.DEFAULT_FILTER_VIEW_WIDTH : pageWidth;
    console.log('loadViewByDashboardName', pageWidth, widgetViewWidth);
    this.setState({
      pageWidth: pageWidth,
      widgetViewWidth: widgetViewWidth,
      isReadOnly: true
    }, () => {
      axios.get(`/ws/dashboard/name/${dashboardName}`)
        .then(res => {
          const result = res.data;
          this.setState({
            dashboardId: result.id,
            name: result.name,
            height: result.height,
          }, () => {
            this.refresh();
          });
        });
    });
  }

  getPageWidth = () => {
    const thisNode = ReactDOM.findDOMNode(this);
    return thisNode.clientWidth;
  }

  handleInputChange = (event) => {
    this.setState({
      [event.target.name]: event.target.value
    });
  }

  toggleAutoRefresh = () => {
    const { autoRefreshTimerId } = this.state;
    if (autoRefreshTimerId) {
      clearInterval(autoRefreshTimerId);
      this.setState({
        autoRefreshTimerId: ''
      });
    } else {
      const timerId = setInterval(() => {
        this.refreshWidgetView();
      }, 1000);
      this.setState({
        autoRefreshTimerId: timerId
      });
    }
  }

  refresh = () => {
    console.log('refresh');
    this.refreshWidgetView();
    this.refreshFilterView();
  }

  refreshFilterView = () => {
    const { 
      dashboardId
    } = this.state;
    this.filterViewPanel.current.fetchFilters(dashboardId);
  }

  refreshWidgetView = () => {
    const { 
      dashboardId,
      widgetViewWidth
    } = this.state;
    this.widgetViewPanel.current.fetchWidgets(dashboardId, widgetViewWidth, null);

    const now = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
    this.setState({
      lastRefreshed: now
    });
  } 

  save = () => {
    console.log('save');
    const {
      dashboardId,
      name,
      height
    } = this.state;

    const dashboard = {
      id: dashboardId, 
      name: name,
      height: height
    };

    axios.put('/ws/dashboard/', dashboard)
      .then(res => {
      });

    this.widgetViewPanel.current.saveWidgets();

    this.props.onSaveDashboard(dashboardId);

    this.setState({
      isEditMode: false
    });
  }

  edit = () => {
    this.setState({
      isEditMode: true
    });
  }

  cancelEdit = () => {
    this.setState({
      isEditMode: false
    });
  }

  delete = () => {
    const { dashboardId } = this.state;
    console.log('delete', dashboardId);
    axios.delete(`/ws/dashboard/${dashboardId}`)
      .then(res => {
        //this.fetchBoards();
      });
  }

  onSaveWidget = () => {
    this.setState({ 
      showWidgetEditPanel: false 
    });
    // FIXME: not need to refresh. Just add to state.widgets
    this.refreshWidgetView();
  }

  onSaveFilter = () => {
    this.setState({ 
      showFilterEditPanel: false 
    });
    // FIXME: not need to refresh. Just add to state.widgets
    this.refreshFilterView();
  }

  toggleFilterViewPanel = () => {
    const { 
      showFilterViewPanel
    } = this.state;
    this.resizePageLayout(!showFilterViewPanel);
  }

  resizePageLayout = (showFilterViewPanel) => {
    const pageWidth = this.getPageWidth();;
    let widgetViewWidth = showFilterViewPanel ? pageWidth - Constants.DEFAULT_FILTER_VIEW_WIDTH : pageWidth;
    this.widgetViewPanel.current.resizeGrid(widgetViewWidth, true);

    this.setState({
      showFilterViewPanel: showFilterViewPanel,
      widgetViewWidth: widgetViewWidth
    }); 
  }

  openFilterEditPanel = (filterId) => {
    this.filterEditPanel.current.fetchFilter(filterId);
    this.setState({
      showFilterEditPanel: true
    });
  }

  openWidgetEditPanel = (widgetId) => {
    const { dashboardId } = this.state;
    this.widgetEditPanel.current.fetchWidget(widgetId, dashboardId);
    this.setState({
      showWidgetEditPanel: true
    });
  }

  applyFilters = (filterParams) => {
    this.widgetViewPanel.current.queryWidgets(filterParams);
  }

  fullScreen = () => {
    const { name } = this.state;
    const url = `/workspace/dashboard/view?name=${name}`;
    window.open(url, '_blank');
  }

  onTableCellClick = () => {
    this.props.history.push(`/workspace/dashboard/drill?name=&`);
  }

  render() {
    const {
      autoRefreshTimerId,
      lastRefreshed,
      isEditMode,
      isReadOnly
    } = this.state;
    const autoRefreshStatus = autoRefreshTimerId === '' ? 'OFF' : 'ON';

    let editButtonPanel;
    let fullScreenButtonPanel;
    if (!isReadOnly) {
      fullScreenButtonPanel = (
        <React.Fragment>
          <button className="button icon-button" onClick={this.fullScreen}>
            <FontAwesomeIcon icon="tv" size="lg" fixedWidth />
          </button>
        </React.Fragment>
      );

      if (isEditMode) {
        editButtonPanel = (
          <React.Fragment>
            <button className="button" onClick={this.cancelEdit}>Cancel</button>
            <button className="button" onClick={this.save}>Save</button>
            <button className="button" onClick={this.delete}>Delete</button>
            <button className="button" onClick={() => this.openFilterEditPanel(null)}>Add Filter</button>
            <button className="button" onClick={() => this.openWidgetEditPanel(null)}>Add Widget</button>
          </React.Fragment>
        );
      } else {
        editButtonPanel = (
          <React.Fragment>
            <button onClick={this.edit}>Edit</button>
          </React.Fragment>
        );
      }
    }

    return (
      <React.Fragment>
        <div className="row">
          <div className="float-left">
            <input 
              type="text" 
              name="name" 
              value={this.state.name}
              onChange={this.handleInputChange} 
              style={{width: '200px'}}
              readOnly={isReadOnly || !isEditMode}
              />
          </div>
          <div className="float-right">
            <span>Last refreshed: {lastRefreshed}</span>
            <button className="button icon-button" onClick={this.toggleAutoRefresh}>
              {
                autoRefreshStatus === 'ON' ? 
                (
                  <FontAwesomeIcon icon="stop-circle" size="lg" fixedWidth />
                ) : 
                (
                  <FontAwesomeIcon icon="play-circle" size="lg" fixedWidth />
                )
              }
            </button>
            <button className="button icon-button" onClick={this.refresh}>
              <FontAwesomeIcon icon="redo-alt" size="lg" fixedWidth />
            </button>
            <button className="button" onClick={this.toggleFilterViewPanel}>Show Filters</button>
            
            {fullScreenButtonPanel}
            {editButtonPanel}
          </div>
        </div>
        {
          (!isReadOnly && isEditMode) ?
          (
            <div className="dashboard-attribute-edit-panel">
              <div className="inline-block">Height:</div>
              <input 
                type="text" 
                name="height" 
                value={this.state.height}
                onChange={this.handleInputChange} 
                className="inline-block" 
                style={{width: '200px'}}
                />

              <div className="inline-block">Background Color</div>
              <ColorPicker />

            </div>
          ) : null
        }

        <WidgetViewPanel 
          ref={this.widgetViewPanel} 
          onWidgetEdit={this.openWidgetEditPanel}
          isEditMode={this.state.isEditMode}
          height={this.state.height}
          widgetViewWidth={this.state.widgetViewWidth}
        />
        <FilterViewPanel 
          ref={this.filterViewPanel} 
          onEdit={this.openFilterEditPanel}
          onApplyFilters={this.applyFilters}
          isEditMode={this.state.isEditMode}
          show={this.state.showFilterViewPanel}
        />

        <Modal 
          show={this.state.showWidgetEditPanel}
          onClose={() => this.setState({ showWidgetEditPanel: false })}
          modalClass={'lg-modal-panel'} 
          title={'Widget Edit'} >
          <WidgetEditPanel 
            ref={this.widgetEditPanel} 
            jdbcDataSourceOptions={this.state.jdbcDataSourceOptions}
            dashboardId={this.state.dashboardId}
            onSave={this.onSaveWidget}
          />
        </Modal>

        <Modal 
          show={this.state.showFilterEditPanel}
          onClose={() => this.setState({ showFilterEditPanel: false })}
          modalClass={'lg-modal-panel'}
          title={'Filter Edit'}>
          <FilterEditPanel
            ref={this.filterEditPanel}
            jdbcDataSourceOptions={this.state.jdbcDataSourceOptions}
            dashboardId={this.state.dashboardId}
            onSave={this.onSaveFilter}
          />
        </Modal>

      </React.Fragment>
    )
  };
}

export default withRouter(DashboardEditView);
