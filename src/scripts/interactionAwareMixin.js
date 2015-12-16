// From https://github.com/Sitebase/cssinjs/tree/feature-interaction-mixin
import ReactDOM from 'react-dom';

const InteractionAwareMixin = {
  componentWillMount: function() {
    this.state = this.state || {};
    this.state.hovered = false;
  },
  componentDidMount: function() {
    ReactDOM.findDOMNode(this).addEventListener("mouseover", this.onOver);
    ReactDOM.findDOMNode(this).addEventListener("mouseout", this.onOut);
  },
  componentWillUnmount: function() {
    ReactDOM.findDOMNode(this).removeEventListener("mouseover", this.onOver);
    ReactDOM.findDOMNode(this).removeEventListener("mouseout", this.onOut);
  },
  onOver: function() {
    this.setState({ hovered: true });
  },
  onOut: function() {
    this.setState({ hovered: false });
  },
};

export default InteractionAwareMixin;
