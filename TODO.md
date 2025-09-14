# TODO for ResumeUpload Component Enhancement

- [x] Update formatParsedData function to optionally use originalText for preserving formatting.
- [x] Save originalText along with parsedData when saving previous resumes to localStorage.
- [x] Use originalText when loading and displaying previous resumes.
- [x] Update handleSelectPreviousResume to use originalText when available.
- [x] Remove quick analysis results section below the uploading resume text section.
- [x] Fix pipeline navigation issue - ensure pipeline is created/updated when uploading resume.
- [ ] Test ResumeUpload component:
  - Paste resume text and preview parsed data.
  - Upload resume text and verify it is saved with originalText.
  - Select previous resumes and verify original formatting is preserved.
  - Test job description input and tailoring functionality.
  - Test navigation to next steps (interview or tailoring) - should now move to stage 2 after upload.
- [ ] Review UI for any layout or styling issues.
- [ ] Verify no console errors or warnings during usage.

# Next Steps

- Run development server and manually test the ResumeUpload component.
- Address any issues found during testing.
