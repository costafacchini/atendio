import { getToken } from './auth'
import api from './api'
import parseUrl from './objectToQueryParameter'

const headers = () => ({ 'x-access-token': getToken() })

function getDepartments(queryParams: any) {
  const url = parseUrl('resources/departments/', queryParams)
  return api().get(url, { headers: headers() })
}

function getDepartment(id: any) {
  return api().get(`resources/departments/${id}`, { headers: headers() })
}

function createDepartment(values: any) {
  return api().post('resources/departments/', { body: values, headers: headers() })
}

function updateDepartment(department: any) {
  return api().post(`resources/departments/${department.id}`, { headers: headers(), body: department })
}

function deleteDepartment(id: any) {
  return api().delete(`resources/departments/${id}`, { headers: headers() })
}

function getDepartmentBaileysStatus(department: any) {
  return api().get(`resources/departments/${department.id}/baileys-status`, { headers: headers() })
}

function getDepartmentBaileysQr(department: any) {
  return api().post(`resources/departments/${department.id}/baileys-qr`, { headers: headers() })
}

function syncDepartmentBaileys(department: any) {
  return api().post(`resources/departments/${department.id}/baileys-sync`, { headers: headers() })
}

function getDepartmentWppconnectServerStatus(department: any) {
  return api().get(`resources/departments/${department.id}/wppconnect-server-status`, { headers: headers() })
}

function getDepartmentWppconnectServerQr(department: any) {
  return api().post(`resources/departments/${department.id}/wppconnect-server-qr`, { headers: headers() })
}

export {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentBaileysStatus,
  getDepartmentBaileysQr,
  syncDepartmentBaileys,
  getDepartmentWppconnectServerStatus,
  getDepartmentWppconnectServerQr,
}
