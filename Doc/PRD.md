# Edvance — Product Requirements Document

**Product Name:** Edvance  
**Category:** Impact & Innovation  
**Document Type:** Product Requirements Document (PRD) / Product Bible  
**Version:** 1.0  
**Status:** Planning / MVP  
**Owner:** Oluwatimileyin Oyelabi

---

## 1. Product Overview

Edvance is an AI-powered course intelligence platform that helps learners understand what their instructor actually taught, determine what they are expected to master, and identify the areas where they still need improvement.

Learners often receive course content through different sources such as lecture videos, slides, PDFs, notes, course outlines, assignments, and assessments. These materials are usually disconnected, making revision difficult and forcing students to manually determine how concepts, lectures, and assessment questions relate to one another.

Edvance brings these materials together into a structured learning workspace. It analyzes course content, preserves instructor-specific terminology, maps assessments back to supporting learning materials, identifies inconsistencies between sources, and helps learners focus their revision on genuine mastery gaps.

Edvance is not intended to be another generic AI summarizer. Its core value is understanding the structure and expectations of a specific course.

---

## 2. Product Vision

To make every learner clearly understand:

**What was taught → what is expected → where the evidence is → what they have not mastered yet → what they should study next.**

The long-term vision is for Edvance to become an intelligent layer between course materials, instructors, assessments, and learners.

---

## 3. Problem Statement

Students and participants in structured learning programmes often receive knowledge through fragmented materials such as:

- Recorded lectures
- Presentation slides
- PDFs
- Class notes
- Course outlines
- Assignments
- Assessment questions
- Instructor announcements

The learner must manually connect these materials.

This creates several problems:

- Important concepts can be missed during revision.
- Students may not know which parts of a lecture relate to an assessment.
- Instructor-specific terminology may be replaced by generic explanations.
- Contradictions between slides, lectures, and assessments may go unnoticed.
- Learners may spend significant time studying concepts they already understand while neglecting areas where they are weak.
- Generic AI assistants may provide reasonable answers that are not grounded in what the instructor actually taught.

The core problem is therefore not simply lack of information.

The problem is **lack of alignment between learning materials, assessment expectations, and the learner's actual understanding.**

---

## 4. Target Users

### Primary Users

Edvance is initially designed for:

- University students
- Bootcamp participants
- Fellowship and cohort-based learners
- Students preparing for examinations or assessments
- Learners taking structured online courses

### Secondary Users — Future

Future versions may support:

- Lecturers
- Training organisations
- Universities
- Corporate learning teams
- Professional certification providers

---

## 5. User Persona

### Primary Persona: The Overloaded Learner

The user attends classes and receives lecture videos, slides, PDFs, assignments, and assessment questions.

They understand some of the course but struggle to determine:

- what matters most,
- where concepts were taught,
- how different topics connect,
- what the instructor expects in assessments,
- and which areas they personally need to revise.

The learner wants a faster way to turn scattered course materials into a clear path toward mastery.

---

## 6. Jobs To Be Done

When I receive many different course materials, I want Edvance to organize and connect them so that I can understand what my instructor expects me to know.

When I receive an assessment question, I want to see which lecture, slide, or course material supports that question so that I can answer based on what was actually taught.

When course materials appear to disagree, I want Edvance to highlight the inconsistency so that I can investigate it rather than unknowingly learning the wrong information.

When preparing for an assessment, I want Edvance to identify the concepts I have not mastered so that I can spend my limited study time on the areas that matter most.

---

## 7. Unique Value Proposition

**Edvance turns fragmented course materials into an evidence-backed map of what a learner is expected to master.**

Instead of only summarizing content, Edvance connects:

**Course Material + Instructor Terminology + Assessments + Learner Understanding**

This allows it to answer questions such as:

- What exactly did my instructor teach about this topic?
- Where in the lecture was this concept discussed?
- Which materials support this assessment question?
- Are the assessment and lecture saying different things?
- Which concepts do I understand?
- Which ones should I revise next?

---

## 8. Core Product Principles

### Source-Grounded

Important claims should trace back to the learner's uploaded course material whenever possible.

### Instructor-Aligned

Edvance should preserve the terminology, frameworks, examples, and structure used by the instructor rather than unnecessarily replacing them with generic language.

### Evidence Before Guessing

If Edvance cannot find enough evidence in the supplied materials, it should clearly communicate that instead of inventing information.

### Mastery Over Summarization

The product should help the learner understand and apply knowledge, not merely generate shorter versions of lecture content.

### Clear Provenance

The learner should be able to see where important information came from.

---

## 9. Main User Journey

### Step 1 — Create a Course Workspace

The learner creates a workspace for a course or programme.

Example:

**Qubators AI Foundry**

### Step 2 — Add Learning Materials

The learner uploads or adds:

- Lecture recordings
- Audio recordings
- Slides
- PDFs
- Notes
- Course outlines
- Assessment questions

### Step 3 — Course Analysis

Edvance processes the materials and identifies:

- Major concepts
- Instructor-specific terminology
- Frameworks
- Examples
- Definitions
- Relationships between concepts
- Relevant source locations

### Step 4 — Build the Course Map

Edvance creates a structured representation showing how the topics taught throughout the course relate to each other.

### Step 5 — Assessment Mapping

When assessment questions are provided, Edvance maps each question to relevant:

- Lectures
- Timestamps
- Slides
- Notes
- Concepts

### Step 6 — Detect Possible Inconsistencies

Edvance compares materials and flags situations where different sources appear to conflict.

Example:

**Assessment:** "Name the five components."

**Lecture:** Six components were consistently presented.

Edvance should highlight this discrepancy and show the evidence rather than silently choosing one version.

### Step 7 — Mastery Check

The learner answers practice questions or marks concepts they understand.

Edvance builds a mastery profile showing:

- Mastered concepts
- Developing concepts
- Weak concepts
- Untested concepts

### Step 8 — Targeted Revision

Edvance generates explanations, practice questions, and revision recommendations focused specifically on weak areas.

---

## 10. MVP Features

The first version of Edvance should focus on a small number of high-value capabilities.

### 1. Course Workspace

Users can create a workspace for each course.

### 2. Learning Material Upload

Users can provide supported course materials such as:

- PDF
- Text
- Lecture transcript
- Notes
- Assessment questions

Video/audio transcription may be included directly or introduced in a later iteration depending on development time.

### 3. Course Concept Extraction

Edvance identifies:

- important terms,
- definitions,
- topics,
- frameworks,
- and relationships between concepts.

### 4. Assessment-to-Source Mapping

The learner can provide an assessment question and Edvance identifies the course materials most relevant to answering it.

Example output:

> Question 4 relates mainly to Lesson 2.  
> Supporting material: Prompt Engineering lecture, 38:20–44:10.  
> Related framework: P-R-O-M-P-T.

### 5. Course Inconsistency Detector

Edvance identifies potentially conflicting information across learning materials.

It should show:

- Source A
- Source B
- The suspected inconsistency
- Why it was flagged

The AI should not automatically decide which source is correct when the supplied evidence is insufficient.

### 6. Mastery Gap Identification

Edvance records learner performance on practice questions and identifies topics requiring further revision.

### 7. Targeted Practice

The system generates practice questions based on weak concepts rather than randomly generating questions from the entire course.

---

## 11. Signature Features

The features intended to differentiate Edvance are:

### Assessment-to-Source Mapping

Connect an assessment question directly to the material where the required knowledge was taught.

### Course Consistency Intelligence

Detect possible mismatches between:

- lectures,
- slides,
- notes,
- course outlines,
- and assessments.

### Instructor Vocabulary Preservation

Recognize and retain instructor-specific frameworks and terminology.

### Mastery Mapping

Show what the learner has mastered and what should be studied next.

These features should receive priority over generic AI features.

---

## 12. Example Use Case

A learner attends an 82-minute Prompt Engineering class.

The assessment later asks:

> "What are the five components of the PROMPT framework?"

Edvance analyzes the lecture and discovers that the instructor consistently taught:

1. Purpose
2. Role
3. Objective
4. Method
5. Parameters
6. Target Output

Instead of blindly answering with five items, Edvance displays:

**Possible inconsistency detected.**

Assessment asks for **5 components**, while the lecture material contains **6 components**.

**Evidence:**  
Lecture segment: [timestamp]  
Relevant slide: P-R-O-M-P-T Framework

The learner can then make an informed decision based on the actual course evidence.

---

## 13. AI Behaviour Requirements

Edvance should:

- Prioritize uploaded course sources.
- Clearly distinguish source-based information from general AI knowledge.
- Preserve instructor-specific terminology.
- Avoid fabricating citations or timestamps.
- Indicate uncertainty when evidence is insufficient.
- Show evidence supporting important conclusions.
- Ask clarifying questions when necessary.
- Avoid presenting assumptions as facts.

---

## 14. Functional Requirements

The MVP should allow a user to:

1. Create a course.
2. Upload or enter course materials.
3. View extracted concepts.
4. Ask questions about those materials.
5. Add assessment questions.
6. See relevant sources connected to an assessment.
7. View detected inconsistencies.
8. Take targeted practice questions.
9. View basic mastery status.

---

## 15. Non-Functional Requirements

### Usability

The interface should be simple enough for a learner to understand without technical knowledge.

### Performance

Normal text-based interactions should return responses within a reasonable time.

### Reliability

Source references must accurately correspond to the material being cited.

### Privacy

Users should understand what learning materials are being processed and stored.

### Accessibility

The interface should use readable typography, clear navigation, and mobile-friendly layouts where possible.

---

## 16. Initial Screens / Pages

### Landing Page

Explains what Edvance does and allows the user to create or access a workspace.

### Dashboard

Displays the learner's courses and recent activity.

### Course Workspace

Contains:

- Sources
- Course Map
- Assessments
- Mastery
- Practice

### Source Viewer

Displays uploaded material and relevant extracted information.

### Assessment Intelligence Page

Shows:

- Assessment question
- Related concepts
- Supporting sources
- Possible inconsistencies
- Revision recommendations

### Mastery Dashboard

Displays learner progress and identifies weak areas.

---

## 17. Success Metrics

Early product success can be evaluated using:

- Percentage of assessment questions successfully mapped to course sources
- Accuracy of source references
- Number of detected inconsistencies validated by users
- Improvement in learner performance on practice questions
- Reduction in time required to locate relevant course material
- Percentage of learners who return to continue studying
- User-reported confidence before an assessment

---

## 18. MVP Scope

The MVP should prove one central hypothesis:

> A learner receives more value when AI connects assessments and mastery directly to the material their instructor actually taught than when AI simply summarizes their course.

The initial MVP should therefore prioritize:

**Course Sources → Concept Extraction → Assessment Mapping → Evidence → Mastery**

---

## 19. Out of Scope for the First Version

The following features are valuable but are not necessary for the initial MVP:

- AI-generated podcasts
- Social learning feeds
- Full university LMS replacement
- Instructor grading automation
- Live video classes
- Complex gamification
- AI avatars
- Automatic certification
- Large-scale institutional administration

These may be considered after the core product has been validated.

---

## 20. Competitive Positioning

Edvance should not compete primarily by claiming to summarize PDFs or generate quizzes.

Many AI learning tools already provide these capabilities.

Edvance should differentiate itself through:

**course intelligence, assessment alignment, source evidence, instructor terminology, inconsistency detection, and mastery mapping.**

The product should answer:

> "What am I actually expected to know, where was it taught, and what should I study next?"

---

## 21. Product Risks

### Risk: Becoming a Generic AI Study Assistant

Mitigation: Prioritize assessment mapping, source alignment, and mastery intelligence.

### Risk: Incorrect AI Interpretation

Mitigation: Show source evidence and allow users to inspect the original material.

### Risk: Hallucinated Course Information

Mitigation: Use retrieval from supplied materials and clearly mark unsupported claims.

### Risk: Too Many Features During MVP

Mitigation: Build the smallest complete learning loop before expanding.

---

## 22. Development Priority

### Phase 1 — Foundation

- Project structure
- Course workspace
- Source input
- Basic UI

### Phase 2 — Course Intelligence

- Concept extraction
- Source-grounded question answering
- Instructor terminology extraction

### Phase 3 — Assessment Intelligence

- Assessment input
- Assessment-to-source mapping
- Inconsistency detection

### Phase 4 — Mastery

- Practice generation
- Performance tracking
- Mastery map
- Personalized revision recommendations

---

## 23. Definition of MVP Success

The MVP will be considered successful when a learner can:

1. Add course material.
2. Add an assessment question.
3. Ask Edvance to determine what concepts are required.
4. See where those concepts were taught in the provided material.
5. Identify a potential inconsistency when one exists.
6. Receive targeted practice based on the relevant concepts.

If this complete loop works reliably, Edvance has demonstrated its core value.

---

## 24. One-Sentence Product Description

**Edvance is an AI-powered course intelligence platform that connects what instructors teach with what learners are assessed on, providing evidence-backed course understanding, inconsistency detection, and personalized mastery guidance.**

---

## 25. Product North Star

Edvance should help a learner move from:

**"I have all these materials, but I don't know what matters."**

to:

**"I know what I need to understand, where it was taught, what I am missing, and what I should study next."**