// Strict JSON validation without coercion. Only validated, allow-listed data reaches handlers.
const fail = message => { throw new Error(message); };
function object(value, allowed, required = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected a JSON object');
    if (Object.keys(value).some(key => !allowed.includes(key))) fail('Unexpected field in payload');
    if (required.some(key => !Object.hasOwn(value, key))) fail('Required field is missing');
}
function text(value, max, empty = false) {
    if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail('Invalid text field');
    return value.trim();
}
function number(value, min, max = Number.MAX_SAFE_INTEGER) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail('Invalid numeric value or range');
    return value;
}
function url(value) {
    const result = text(value, 2048);
    let parsed;
    try { parsed = new URL(result); } catch { fail('Image must be an HTTP or HTTPS URL'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail('Image must be an HTTP or HTTPS URL without credentials');
    return result;
}
const restaurantFields = ['name', 'cuisine', 'image', 'rating', 'deliveryTime', 'minOrder', 'isOpen', 'address', 'location', 'operatingHours'];
const menuFields = ['name', 'description', 'image', 'images', 'category', 'price', 'isSpicy', 'discount'];
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function validate(body, kind, update) {
    const isRestaurant = kind === 'restaurant';
    const required = isRestaurant ? (update ? [] : ['name', 'cuisine', 'image', 'deliveryTime', 'minOrder', 'location']) : ['name', 'category', 'price'];
    object(body, isRestaurant ? restaurantFields : menuFields, required);
    if (!Object.keys(body).length) fail('Payload must not be empty');
    const result = {};
    for (const [key, value] of Object.entries(body)) {
        switch (key) {
            case 'name': case 'cuisine': case 'category': result[key] = text(value, 200); break;
            case 'description': result[key] = text(value, 2000, true); break;
            case 'image': result[key] = url(value); break;
            case 'images':
                if (!Array.isArray(value) || value.length < 1 || value.length > 5) fail('Provide one to five images');
                result[key] = value.map(url); break;
            case 'rating': result[key] = number(value, 0, 5); break;
            case 'discount': result[key] = number(value, 0, 100); break;
            case 'price': case 'minOrder': case 'deliveryTime': result[key] = number(value, 0); break;
            case 'isOpen': case 'isSpicy':
                if (typeof value !== 'boolean') fail('Expected a boolean');
                result[key] = value; break;
            case 'address': {
                const fields = ['street', 'city', 'state', 'zipCode'];
                object(value, fields);
                result[key] = Object.fromEntries(Object.entries(value).map(([field, entry]) => [field, text(entry, 300, true)]));
                break;
            }
            case 'location':
                object(value, ['type', 'coordinates'], ['type', 'coordinates']);
                if (value.type !== 'Point' || !Array.isArray(value.coordinates) || value.coordinates.length !== 2) fail('Expected a GeoJSON Point with two coordinates');
                result[key] = { type: 'Point', coordinates: [number(value.coordinates[0], -180, 180), number(value.coordinates[1], -90, 90)] };
                break;
            case 'operatingHours':
                object(value, days);
                result[key] = {};
                for (const [day, hours] of Object.entries(value)) {
                    object(hours, ['open', 'close'], ['open', 'close']);
                    const validTime = time => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
                    // An empty pair represents a closed day; overnight opening is supported.
                    if (!(hours.open === '' && hours.close === '') && !(validTime(hours.open) && validTime(hours.close))) fail('Hours must be HH:mm pairs or an empty pair');
                    result[key][day] = { open: hours.open, close: hours.close };
                }
                break;
        }
    }
    if (!isRestaurant && !update && !result.image && !result.images) fail('At least one image is required');
    if (!isRestaurant && result.image && result.images && result.image !== result.images[0]) fail('Primary image must match the first image');
    return result;
}

const validatePayload = (kind, update = false) => (req, res, next) => {
    try { req.body = validate(req.body, kind, update); }
    catch (error) { return res.status(400).json({ message: error.message }); }
    return next();
};

function safeWriteError(error, res) {
    if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) {
        return res.status(400).json({ message: 'Invalid request data' });
    }
    return res.status(500).json({ message: 'Unable to save changes' });
}

function jsonErrorHandler(error, req, res, next) {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
    return next(error);
}
module.exports = { validatePayload, validate, safeWriteError, jsonErrorHandler };
