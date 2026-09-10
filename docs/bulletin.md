h1. Bulletin

Shared studio announcements across the public site, members, staff, and admin.

----

h2. Pages

||Page||Who it is for||What they see||
|/bulletin|Public website|Public + approved posts only|
|/member-bulletin|Members|Approved posts they are allowed to read|
|/staff-bulletin|Coaches / staff|Approved posts they are allowed to read|
|/admin-bulletin|Admin portal writers|Create, edit, delete, attach files. Shows pending and live posts|
|/admin-staff → Bulletin Approvals|Admin|Approves submissions from other writers|

----

h2. Who can write

* *Create / edit / delete:* admin, frontdesk, marketing, and dev
* *Everyone else:* read only

----

h2. Approval

* {{admin_approved}} must be true before a post goes live
* *Admin* posts are approved automatically
* *Dev / frontdesk / marketing* posts start pending and wait in Staffing → Bulletin Approvals
* Only an *admin* can approve
* If a non-admin edits a live post, it goes back to pending
* Unapproved posts do not appear on the public, member, or staff bulletin pages
* Admin and dev can read every post, including pending. They are not audience targets.

----

h2. Post UID

Each post has a hidden Supabase UUID and a short UID used in the post details and when talking about the post.

*Format:* {{B-YYYYMMxxx}}

||Part||Meaning||
|B|Constant letter|
|YYYY|Year of creation (Philippines time)|
|MM|Month of creation, 01–12|
|xxx|Increment for that month, starting at 001|

* Resets to {{001}} when the month changes
* Example: first post in September 2026 is {{B-202609001}}. The next is {{B-202609002}}. October starts again at {{B-202610001}}.

----

h2. Reach tags (visibility)

||Tag||Who can see it||
|Public|Everyone, including /bulletin|
|Private|Internal — members and staff. Not on the public page|
|Staff|Staff only. No members|
|User|Members only|
|Coach|Coaches only|
|Marketing|Marketing only|
|Frontdesk|Front desk only|

{{is_public}} is true only when visibility is public. A public post still needs admin approval before it goes live.

----

h2. Schedule and status

||Field||Meaning||
|Created|Set automatically when the post is saved. Not editable.|
|Post datetime|When the post goes live. A future value schedules it.|
|Active until|When the post expires. Empty means it stays live until turned off.|
|is_active|Stored true/false. Automatically set to false when active until is reached.|

A post is *active* only when {{admin_approved}} is true, {{is_active}} is true, the post datetime has been reached, and active until is empty or still in the future.

* Posts are never published without admin approval
* If the author is an admin, {{admin_approved}} defaults to true; otherwise it starts false and waits in Staffing → Bulletin Approvals
* Public, member, and staff bulletin pages show active posts only
* Admin lists are split into Active, Inactive, and Scheduled

----

h2. Post types

* Event
* Promo
* Announcement
* Update

----

h2. Files

* Bucket: {{bulletin_resources}} (public read, writer upload)
* Optional preview image: {{image_path}} → {{post_id/cover/filename}}. Shown on list cards and the admin preview panel. Add or replace it from the *Preview image* field when creating or editing a post.
* Optional attachment path: {{post_id/attachment/filename}}
* Allowed: images, PDF, Word
* Limit: attachment 25 MB

----

h2. Backend

* Migrations: {{supabase/migrations/036_bulletin.sql}}, {{supabase/migrations/038_bulletin_schedule.sql}}
* Table: {{public.bulletin_posts}}
* App API: {{src/lib/bulletin.ts}} and {{src/lib/bulletin-service.ts}}
* RLS: readers need the right audience, admin approval, *and* an active schedule window. Writers can still see pending, scheduled, and expired posts.
