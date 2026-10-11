/**
 * Download a JSON string as `<fileName>_<timestamp>.json`
 */
export function downloadJson(fileName: string, json: string): void {
  const link = document.createElement('a')
  link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(json)
  link.download = `${fileName}_${Date.now()}.json`
  link.click()
  link.remove()
}
