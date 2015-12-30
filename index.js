import cuid from 'cuid';
import React from 'react';
import ReactDOM from 'react-dom';
import Firebase from 'firebase';
import dateFormat from 'dateformat';

const firebaseUrl = 'https://breastfeeding.firebaseio.com/';

function partition(arr, by) {
  let result = {};
  arr.forEach(val => {
    let bucket = by(val);
    (result[bucket] = result[bucket] || []).push(val)
  });
  return result;
}

function msToTime(s) {
  // convert up to nearest minute
  s = Math.floor(s / 1000 / 60);
  var mins = s % 60;
  s = (s - mins) / 60;
  var hrs = s % 24;
  var days = (s - hrs) / 24;
  var result = '';

  if (days) {
    result += `${days} day`
    if (days > 1) {
      result += 's';
    }
  }

  if (hrs) {
    if (result) {
      result += ', ';
    }
    result += `${hrs} hour`
    if (hrs > 1) {
      result += 's';
    }
  }

  if (mins) {
    if (result) {
      result += ', ';
    }
    result += `${mins} min`
    if (mins > 1) {
      result += 's';
    }
  }

  if (!result) {
    result = '-';
  }

  return result;
}

// from http://stackoverflow.com/a/19691491/473961
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

let DateRow = React.createClass({
  displayName: 'DateRow',

  propTypes: {
    date: React.PropTypes.number.isRequired
  },

  render() {
    return (
      <tr className='date-row'>
        <td>{dateFormat(this.props.date, 'mmm d')}</td>
      </tr>
    );
  }
});


let Row = React.createClass({
  displayName: 'Row',

  propTypes: {
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    type: React.PropTypes.string.isRequired,
    wet: React.PropTypes.number,
    poo: React.PropTypes.number,
    onDelete: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      onDelete: _=>{}
    }
  },

  getInitialState() {
    return {
      deleting: false
    }
  },

  onDelete() {
    this.setState({
      deleting: true
    });

    this.props.onDelete();
  },

  render() {
    let buttonProps = {};

    if (this.state.deleting) {
      buttonProps = {
        disabled: 'disabled'
      }
    }

    return (
      <tr className={this.state.deleting ? 'deleting' : ''}>
        <td></td>
        <td>{dateFormat(this.props.start, 'HH:MM')}</td>
        <td>{msToTime(this.props.end - this.props.start)}</td>
        <td>{this.props.type}</td>
        <td>{Array(this.props.wet + 1).join('✓')}</td>
        <td>{Array(this.props.poo + 1).join('✓')}</td>
        <td><button onClick={this.onDelete} {...buttonProps}>delete</button></td>
      </tr>
    );
  }
});

let Rows = React.createClass({
  displayName: 'Rows',

  propTypes: {
    rows: React.PropTypes.array,
    onDelete: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      onDelete: _=>{}
    }
  },

  partitionRows(rows) {
    return partition(rows, row => +new Date(dateFormat(row.start, 'yyyy-mm-dd')))
  },

  getInitialState() {
    return {
      rows: this.partitionRows(this.props.rows)
    }
  },

  componentWillReceiveProps(nextProps) {
    console.log(this.state.rows);
    this.setState({
      rows: this.partitionRows(nextProps.rows)
    });
    console.log(this.state.rows);
  },

  render() {

    let sortedDateKeys = Object.keys(this.state.rows).map(key => +key).sort()

    return (
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Start</th>
            <th>Length</th>
            <th>Type</th>
            <th>Wet</th>
            <th>Poo</th>
          </tr>
        </thead>
        <tbody>

          {sortedDateKeys.map(date => {
            return [
              <DateRow date={date} />,
            ].concat(
              this.state.rows[date].map(row => {
                return (
                  <Row
                    {...row}
                    key={row.key}
                    onDelete={_=> this.props.onDelete(row.key)}
                  />
                );
              })
            );
          })}

        </tbody>
      </table>
    );
  }
});

let AddButton = React.createClass({
  displayName: 'AddButton',

  propTypes: {
    onClick: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      onClick: _=>{}
    }
  },

  render() {
    return <button onClick={this.props.onClick}>Add</button>
  }
});

let Input = React.createClass({
  displayName: 'Input',

  propTypes: {
    name: React.PropTypes.string,
    label: React.PropTypes.string,
    type: React.PropTypes.string,
    value: React.PropTypes.any
  },

  handleChange(event) {
    this.setState({
      value: event.target.value
    });
  },

  getValue() {
    return this.state.value
  },

  getDefaultProps() {
    return {
      type: 'text',
      label: '',
      name: cuid()
    };
  },

  getInitialState() {
    return {
      value: this.props.value
    };
  },

  render() {
    return (
      <div>
        <label htmlFor={this.props.name}>
          {this.props.label}
        </label>
        <input name={this.props.name} type={this.props.type} value={this.state.value} onChange={this.handleChange} />
      </div>
    );
  }
});

let Adder = React.createClass({
  displayName: 'Adder',

  propTypes: {
    onSave: React.PropTypes.func
  },

  handleSave(event) {

    let date = this.refs.date.getValue(),
        start = new Date(`${date} ${this.refs.start.getValue()}`),
        end = new Date(`${date} ${this.refs.end.getValue()}`);

    event.preventDefault();
    event.stopPropagation();

    // assume that an end time before start time means it's ticked over midnight
    if (+end < +start) {
      end = addDays(end, 1);
    }

    let data = {
      start: +start,
      end: +end,
      type: this.refs.type.getValue(),
      wet: +this.refs.wet.getValue(),
      poo: +this.refs.poo.getValue()
    };

    this.props.onSave(data);
  },

  getDefaultProps() {
    return {
      onSave: _=>{}
    }
  },

  render() {
    return (
      <form onSubmit={this.handleSave}>
        <Input name='date' type='date' label='Date' value={dateFormat('yyyy-mm-dd')} ref='date' />
        <Input name='start' type='time' label='Start' value='00:00' ref='start' />
        <Input name='end' type='time' label='End' value='00:00' ref='end' />
        <Input name='type' type='text' label='Type' value='' ref='type' />
        <Input name='wet' type='number' label='Wet' value='0' ref='wet' />
        <Input name='poo' type='number' label='Poo' value='0' ref='poo' />
        <button type='submit'>Save</button>
      </form>
    );
  }
});

let App = React.createClass({
  displayName: 'App',

  enableAdder() {
    this.setState({
      adding: true
    });
  },

  saveAddition(newRow) {
    this.state.firebaseRef.push(newRow);
    this.setState({adding: false});
  },

  sortRows(rows) {
    // sort by start time ascending
    return rows.sort((row1, row2) => row1.start - row2.start);
  },

  deleteRow(key) {

    let row = Object.assign({}, this.state.rowsByKey[key], {hidden: true});

    // will trigger the appropriate `child_changed` event
    (new Firebase(`${firebaseUrl}/${key}`)).update(row);
  },

  hideRow(key) {
    let rowsByKey = Object.assign(this.state.rowsByKey),
        rows = this.state.rows.slice(),
        row = rowsByKey[key],
        rowsIndex = this.state.rows.indexOf(row);

    delete rowsByKey[key];

    if (rowsIndex >= 0) {
      rows.splice(rowsIndex, 1);
    }

    this.setState({rows, rowsByKey})
  },

  componentWillMount() {
    let firebaseRef = new Firebase(firebaseUrl);
    this.setState({firebaseRef});

    function insertRowWithKey(rowsByKey, key, row) {
      rowsByKey[key] = Object.assign({key}, row);
      return rowsByKey;
    }

    function addRow(key, val) {

      // already know about this one
      if (this.state.rowsByKey[key] || val.hidden) {
        return;
      }

      // duplicate the index
      let rowsByKey = Object.assign({}, this.state.rowsByKey);

      // duplicate array by value
      let rows = this.state.rows.slice();

      insertRowWithKey(rowsByKey, key, val);
      // TODO: binary insertion into sorted array
      rows.push(rowsByKey[key]);

      // sort
      rows = this.sortRows(rows);

      this.setState({rows, rowsByKey});
    }

    firebaseRef.once('value', data => {

      let rows = [],
          rowsByKey = {},
          firebaseRows = data.val();

      // build up the rows injecting the keys
      for (let key in firebaseRows) {
        if (!firebaseRows[key].hidden) {
          // inject the key into the object and store it under that key
          insertRowWithKey(rowsByKey, key, firebaseRows[key]);
          // purposely share the objects
          rows.push(rowsByKey[key])
        }
      }

      rows = this.sortRows(rows);

      this.setState({rows, rowsByKey, loading: false});

      // Triggers once for _every_ item that exists regardless of if it's new or
      // existing when the app starts.
      firebaseRef.on("child_added", dataSnapshot => {
        console.log('child_added');
        addRow.call(this, dataSnapshot.key(), dataSnapshot.val());
      });

      firebaseRef.on("child_removed", dataSnapshot => {
        console.log('child_removed', dataSnapshot.key());
        this.hideRow(dataSnapshot.key())
      });

      firebaseRef.on("child_changed", dataSnapshot => {

        let key = dataSnapshot.key(),
            val = dataSnapshot.val();

        console.log('child_changed', key, val);

        this.hideRow(key);

        if (!val.hidden) {
          addRow.call(this, key, val)
        }

      });
    });

  },

  getInitialState() {
    return {
      loading: true,
      adding: false,
      rows: []
    }
  },

  render() {
    let addEl;

    if (this.state.loading) {
      return (
        <div>Loading...</div>
      )
    }

    if (this.state.adding) {
      addEl = <Adder onSave={this.saveAddition} />
    } else {
      addEl = <AddButton onClick={this.enableAdder} />
    }

    return (
      <section>
        <Rows rows={this.state.rows} onDelete={this.deleteRow} />
        {addEl}
      </section>
    );
  }
});

let targetEl = document.createElement('div');

document.getElementsByTagName('body')[0].appendChild(targetEl);

ReactDOM.render(
  <App />,
  targetEl
)
