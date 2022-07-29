import {createEvent, createStore, sample} from 'effector'
import {
  createListApi,
  createSelection,
  createItemApi,
  createIndex,
  createAggregate,
} from '../keyval/core'

import type {Todo, InputTodo} from './types'

export const todos = createListApi<Todo, 'id'>({
  key: 'id',
  keygen: () => `id-${Math.random().toString(36).slice(2, 10)}`,
})

export const addTodo = todos.addItemTree({
  normalize: (input: InputTodo) =>
    typeof input === 'string' ? {title: input} : input,
  convertInput: ({title, parentTask}, childOf) => ({
    title,
    titleEdited: title,
    completed: false,
    editing: false,
    childOf: parentTask ?? childOf,
  }),
  getChilds: (item) => item.subtasks,
})
export const toggleAll = todos.setAll('completed')
export const clearCompleted = todos.removeByField('completed')

export const completedSelection = createSelection({
  kv: todos,
  cases: {
    active: ({completed}) => !completed,
    completed: ({completed}) => completed,
    all: () => true,
  },
  initialCase: 'all',
})

export const subtasksVisibleAmount = createAggregate({
  kv: todos,
  aggregateField: 'childOf',
  fn: (childs) => childs.length,
  selection: completedSelection,
  defaultValue: 0,
})

export const subtasksTotalAmount = createAggregate({
  kv: todos,
  aggregateField: 'childOf',
  fn: (childs) => childs.length,
  defaultValue: 0,
})

// export const subtasksActiveAmount = createAggregate({
//   kv: todos,
//   aggregateField: 'childOf',
//   fn: childs => childs.length,
//   when: ({completed}) => !completed,
//   defaultValue: 0,
// })

// export const subtasksCompletedAmount = createAggregate({
//   kv: todos,
//   aggregateField: 'childOf',
//   fn: childs => childs.length,
//   when: ({completed}) => completed,
//   defaultValue: 0,
// })

export const $count = completedSelection.state.size

export const todoSelectedChildOf = createIndex({
  kv: todos,
  field: 'childOf',
  selection: completedSelection,
})

export const todoItemApi = createItemApi({
  kv: todos,
  events: {
    toggle: todos.mapItem(({completed}) => ({completed: !completed})),
    save: todos.mapItem(({titleEdited}) => ({
      editing: false,
      title: titleEdited.trim(),
    })),
    remove: todos.removeItem({
      removeChilds: {childField: 'childOf'},
    }),
    setEditing: todos.setField('editing'),
    editMode: todos.mapItem(({title}, editing: boolean) => ({
      editing,
      titleEdited: title,
    })),
    onChange: todos.setField('titleEdited'),
  },
  prepare: {
    editMode: (key, mode: 'on' | 'off') => ({key, value: mode === 'on'}),
  },
})

export const changeDraft = createEvent<string>()
export const $descriptionDraft = createStore('')
  .on(changeDraft, (_, text) => text)
  .reset(addTodo)
export const addTodoFromDraft = createEvent<{childOf: string | null}>()

sample({
  clock: addTodoFromDraft,
  source: $descriptionDraft,
  filter: (title) => title.length > 0,
  fn: (title, {childOf}) => ({title, parentTask: childOf}),
  target: addTodo,
})

addTodo([
  '🖱 Double-click to edit',
  'React',
  {
    title: 'Effector',
    subtasks: ['subtask #1', 'subtask #2'],
  },
])