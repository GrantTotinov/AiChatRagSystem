# Fernhill Tracker 4.2 release notes

Released on 14 October 2026. Fernhill Tracker is the internal tool that teams use to plan sprints and track bugs.

## New features

- **Offline mode.** The desktop app now keeps the last 30 days of boards on your machine and syncs changes when you reconnect. Conflicts are shown side by side so you can pick which version to keep.
- **Saved filters.** Any board filter can be saved and shared with a link. Saved filters appear in the sidebar under "Views".
- **Bulk edit.** Select up to 200 tickets and change their assignee, sprint or labels in one step.
- **Calendar export.** Sprint start and end dates can be added to Outlook or Google Calendar as an iCal feed.

## Improvements

- Boards with more than 1,000 tickets load about 40% faster, because tickets outside the visible area are rendered on demand.
- Search now matches ticket numbers without the project prefix, so "4821" finds "WEB-4821".
- Notification emails are grouped into a single daily digest by default. You can switch back to instant emails in Settings, Notifications.

## Deprecations

- The legacy REST API v1 stops working on 31 March 2027. Move integrations to API v2, which has been available since version 3.8.
- Internet Explorer mode in Edge is no longer supported.

## Known issues

- On macOS 15, the offline mode indicator can stay visible for a few seconds after reconnecting. A fix is planned for 4.2.1.
- Bulk edit does not yet support custom fields.

## Support

Report problems in the #tracker-help channel. The support team answers within one working day.
