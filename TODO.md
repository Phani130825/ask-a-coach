# TODO for Pipeline Navigation Fix

## Information Gathered

- There are two pipeline types: 'tailoring' (stages: uploaded, tailored) and 'interview' (stages: uploaded, tailored, interview, analytics)
- ResumeUpload creates 'tailoring' pipeline by default
- ResumeTailoring has navigation buttons that need to behave differently based on pipeline type
- For interview pipeline: after tailoring, should navigate to interview section (stage 3), with option to view analytics below
- For tailoring pipeline: after download/satisfaction, mark stages finished and exit to analytics
- Commands use ';' instead of '&&' for PowerShell

## Plan

1. ✅ Modify ResumeUpload.tsx: In "Tailor Resume" button, change pipeline type to 'interview' if current is 'tailoring'
2. ✅ Modify ResumeTailoring.tsx: Update action buttons to be conditional based on pipeline type
   - For 'interview' pipeline: Show "Proceed to Interview" (creates interview and navigates) and "View Analytics" buttons
   - For 'tailoring' pipeline: Show "Complete & View Analytics" (marks complete and navigates to analytics) and "Start Interview" buttons
3. ✅ Ensure download button in ResumeTailoring marks pipeline stage correctly for tailoring pipeline
4. Test the navigation flows

## Dependent Files

- ✅ a/src/components/ResumeUpload.tsx
- ✅ a/src/components/ResumeTailoring.tsx

## Followup Steps

- Verify pipeline type changes correctly
- Test interview pipeline creation and navigation to stage 3
- Test tailoring pipeline completion and analytics navigation
- Ensure backend handles pipeline stages properly
