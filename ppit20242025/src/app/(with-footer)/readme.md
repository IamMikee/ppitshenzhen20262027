REGISTRATION FORM PAGE PLAN
===

## DIRECTORY AND JSON FORMAT
```
forms/{formId} { //ACCESSIBLE FOR EVERYONE
  title: str,
  description: str,
  questions: [
    {
      id: str,               // uuid
      label: str,            // question text
      type: "text" | "radio" | "checkbox", //choose 1
      required: bool,
      options?: str[]        // only for radio/checkbox
    }
  ],
  isActive: bool,
  createdBy: str,
  createdAt: timestamp
}

responses/{responseId} { //ONLY ACCESSIBLE BY ADMIN (REQUIRES LOG IN)
  formId: str,
  answers: {
    [questionId]: str | str[]
  },
  submittedAt: timestamp
  submittedBy: user ID
}
```


QUESTION JSON FORMAT (to be sent to firestore db)
```
Question = {
  id: str,
  label: str,
  type: "text" | "radio" | "checkbox", //choose 1
  required: bool,
  options?: str[]
}
```


### IMPORTANT CHANGE:
UID is stored in localStorage, reducing the need to call firestore everytime to fetch the UID.


**(!!!) FLOW :
Admin creates → Firestore stores → User fills → Firestore stores → Admin reads**
**After pressing forms tab in the header, it will redirect to login. After login, the system detects if its admin or user.
* If user, then redirect to user-only page (no edit options)
* If admin, then redirect to admin-only page (editable), SAVE LOGIN INFORMATION TEMPORARILY IN BROWSER CACHE (to be accessed later)!
##

## UPDATED JOBDESK (3/2/26):
* Michael - Create the admin version for the list of forms, hide QR code button if the status is not submitted or has attended, and ensure everything stay connected and all variable names are parallel.

* Kellen - Fix the BarcodeScanner.js to this process flow: **in list of forms page** (admin logs in, admin presses a button that directs them to /barcodescanner) --> opens a web-based barcode scanner, scans the barcode shown by user (NOTE: THE FORMAT OF THE BARCODE IS: "formId;uid", e.g. "YgJDVQi8Te6c6oHu1J4Z;8SS3Va9o0ZZydTOM5Pp6ehXQPTw1) --> perform checks (in the response database, check whether the user has already filled the form (uid exists in response db)) --> call the function updateUser(uid, attendedForms=formID), replace uid and formID with the IDs from the string of the barcode respectively --> close the barcodescanner and display the status of check (successful/failure).

* Miquel - ADMIN FORM: update to add (1. form.headerColor (buat tampilan di list of forms), 2. form.coverImage (buat background card di list of forms, **request the image to be in .webp**)) also add it in the JSON object of createForm() and getFormById(). 

* Aldo - When submitting, other than calling submitResponse(), also call the new function updateUser(uid, submittedForms=formID). Note: (1). uid can be obtained by calling localStorage.getItem("user-id"), (2). The format of updateUser above MUST be exact (include the submittedForms when typing in the parameters) and replace the formID with the actual formID that is being submitted (same variable as the one in submitResponse()).

* Jennickel - Create a design of the page BarcodeScanner.js (in figma preferrably), and refer to the big image written in Kellen's task. Do final checks on the design of adminform and what user see when they open a form (formClient.js). Fix the design flaw where in desktop, the hover hitbox for events tab in the header is too big (when you hover under forms tab/user-pfp tab, it still triggers the dropdown of the events tab when its not supposed to).


## DEADLINES:
>**===DEVELOPMENT PHASE===**
- 18 Jan => Jennickel UI Design for form layout, admin layout, and components styles (figma) & Kellen finishing firebase config (code as well) ✅
- 24 Jan => Each members' draft design and algorithms (additional tasks to be done) ✅
- 31 Jan => Each members' jobdesk (everything should be set by now); tolerance: design and mobile compatibility not finalized (not part of the main goal) (DELAYED) ✅

>**===TESTING & DEPLOYMENT PHASE===**
- 5 Feb => Finish testing for the forms and admin page; note down every improvements that can be made (TEST MOBILE COMPATIBILITY) ✅
- 8 Feb => Finalization of code (ensure everything is written properly and corrrectly + firebase is working smoothly) ✅ User-side Completed
- 18 Feb => Test for form creation + id's match
- 19 Feb => Deployment


## !!! NAMING CONVENTIONS (keep it the same across files): !!!
- Function names: createForm(formData), getFormById(formId), submitResponse(formId, response)
### IMPORTANT NOTE: Every function mentioned above IS SAVED AND CAN BE VIEWED IN src/app/services/forms.js (all functions are exported from here; take the reference from here)

#
**REPO REFERENCE**: https://github.com/hachln/Investsync_EventHelper

**FIREBASE YOUTUBE TUTORIAL** (below): 
- https://firebase.google.com/codelabs/firebase-nextjs#0
- https://www.youtube.com/watch?v=Zj8z-UaD6fo (Firestore realtime update)
- https://www.youtube.com/watch?v=awd_oYcmrRA (skip to 8:07)
