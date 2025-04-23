import { modelNameMap, store } from './schema'
import api from '../../api'

function selectReadableColumns (model, accessTypes = ['read_only', 'read_write']) {
  return model.columns.map((column) => {
    return column.column_type !== 'association' && (accessTypes.includes(column.access_type) || model.primary_key === column.name || column.name.endsWith('currency') || column.name.endsWith('_type'))
      ? column.name
      : null
  }).filter(Boolean).join(',')
}

function queryParams (model, accessTypes = ['read_only', 'read_write']) {
  return {
    fields: fieldsParams(model),
    params: includeParams(model)
  }
}

function includeParams (model, accessTypes = ['read_only', 'read_write']) {
  return model.columns.map((column) => {
    return accessTypes.includes(column.access_type) && (column.reference?.name || column.column_type === 'association')
      ? column.reference?.name || column.format?.association_name
      : null
  }).filter(Boolean).join(',')
}

function fieldsParams (model, accessTypes = ['read_only', 'read_write']) {
  const fields = {
    [model.name]: selectReadableColumns(model, accessTypes)
  }

  model.columns.forEach((column) => {
    if (column.reference?.name && !column.reference.polymorphic && accessTypes.includes(column.access_type)) {
      const referenceModel = modelNameMap[column.reference.model_name]

      if (referenceModel) {
        fields[column.reference.name] ||= selectReadableColumns(referenceModel, accessTypes)
      }
    }

    if (column.column_type === 'association' && accessTypes.includes(column.access_type)) {
      const associationModel = modelNameMap[model.associations.find((assoc) => assoc.name === column.format.association_name)?.model_name]

      if (associationModel) {
        fields[column.format.association_name] ||= selectReadableColumns(associationModel, accessTypes)
      }
    }
  })

  return fields
}

function getWithStore (model, id, refesh = false) {
  const value = !refesh && store[model.name] && store[model.name][id] ? store[model.name][id] : null
  if (!value) {
    const params = queryParams(model)
    return api.get(`data/${model.slug}/${id}`, { params: params })
      .then((result) => {
        store[model.name] = store[model.name] ?? {}
        store[model.name][id] = store[model.name][id] ?? {}
        store[model.name][id] = result.data.data
        return store[model.name][id]
      })
      .catch((error) => {
        if (error.response?.status === 404) {
          this.notFound = true
        } else {
          console.error(error)

          if (error.response?.status === 403) {
            this.notFound = true
          }

          if (error.response?.data?.errors) {
            this.$Message.error(error.response.data.errors.join('\n'))
          } else {
            this.$Message.error(error.message)
          }
        }
      })
  } else {
    return Promise.resolve(value)
  }
}

export { includeParams, fieldsParams, getWithStore }
