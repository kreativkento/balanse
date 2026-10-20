/** @deprecated Import from `./class-service` instead. */
export {
  classToUpsertInput as eventToUpsertInput,
  createClass as createEvent,
  createEmptyClassDraft as createEmptyEventDraft,
  deleteClass as deleteEvent,
  fetchClassesForAdmin as fetchEventsForAdmin,
  formatClassDateTime as formatEventDateTime,
  updateClass as updateEvent,
  type ClassDisplay as EventDisplay,
  type ClassPerson as EventPerson,
  type ClassUpsertInput as EventUpsertInput,
} from './class-service';
