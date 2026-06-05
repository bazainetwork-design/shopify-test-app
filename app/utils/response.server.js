export function successResponse({ status = 200, message = 'ok', data = {} }) {
  return Response.json({
    success: true,
    message,
    data
  }, { status })
}

export function errorResponse({ status = 500, message = 'error', data = {} }) {
  return Response.json({
    success: false,
    message,
    data
  }, { status })
}