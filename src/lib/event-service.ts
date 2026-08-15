/** @deprecated Import from `./class-service` instead. */
export {
  CLASS_STATUSES as EVENT_STATUSES,
  classToUpsertInput as eventToUpsertInput,
  createClass as createEvent,
  createEmptyClassDraft as createEmptyEventDraft,
  deleteClass as deleteEvent,
  fetchClassesForAdmin as fetchEventsForAdmin,
  formatClassDateTime as formatEventDateTime,
  updateClass as updateEvent,
  type ClassDisplay as EventDisplay,
  type ClassPerson as EventPerson,
  type ClassStatus as EventStatus,
  type ClassUpsertInput as EventUpsertInput,
} from './class-service';
