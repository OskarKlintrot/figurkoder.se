import React, { PropTypes } from 'react'

const styles = {
  select: {
      height: '34px',
      width: '100%',
      minWidth: '130px',
      padding: '0',
      border: '1px solid #ccc',
      borderRadius: '2px',
      font: 'inherit',
      boxShadow: '0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.2),0 1px 5px 0 rgba(0,0,0,.12)',
    },
}

class DropdownInput extends React.Component {
  onMenuChange(e){
    this.props.action(e.target.value)
  }

  render() {
    return (
      <select style={styles.select}
        defaultValue={-1}
        onChange={this.onMenuChange.bind(this)}
        disabled={this.props.disabled} >
        <option disabled value={-1}>
          { this.props.description }
        </option>
        {this.props.options.map((option, key) => (
          <option value={key} key={key} >
            {option}
          </option>
        ))}
      </select>
    )
  }
}

DropdownInput.propTypes = {
  action: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

export default DropdownInput
