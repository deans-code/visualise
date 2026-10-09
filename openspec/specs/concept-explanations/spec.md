# concept-explanations Specification

## Purpose

Lets users find out what any term, node, edge, control or view means without leaving the page, using the same right-click gesture as the profile tool.

## Requirements

### Requirement: Open an explanation on demand
The system SHALL open a dismissible explanation panel, anchored near the element, when the user right-clicks it, presses the context-menu key or Shift+F10 while it is focused, presses `?` while it is focused, or long-presses it on touch. A plain click SHALL keep its existing action.

#### Scenario: Right-click
- **WHEN** the user right-clicks the term "React" in the Dictionary
- **THEN** the browser menu is suppressed and a panel shows its name and definition

#### Scenario: Keyboard
- **WHEN** a focused element supports explanation and the user presses `?`
- **THEN** the same panel opens, and Escape closes it and returns focus to that element

#### Scenario: Touch
- **WHEN** the user presses and holds an explainable element for 500ms
- **THEN** the panel opens and the trailing tap does not trigger the element's click action

### Requirement: Explainable elements
The following SHALL be explainable: terms (definition, kind, section, category), people (what their node and counts represent), network edges (weight, shared and related terms and what they mean), the view switcher entries, the filter controls (including adjacency), matrix cells and legend items, and the dictionary status labels (defined, undefined, custom).

#### Scenario: Edge
- **WHEN** the user right-clicks an edge between two people
- **THEN** the panel explains that the edge means shared or related terms and states how many of each

#### Scenario: Control
- **WHEN** the user right-clicks the adjacency control
- **THEN** the panel explains what exact-only and full relatedness mean for the network

### Requirement: Graceful fallback
Elements with no explanation available SHALL keep the browser's normal context menu, and a term lacking a stored definition SHALL say so and point to term review.

#### Scenario: Unknown custom term
- **WHEN** the user right-clicks a custom term with no definition
- **THEN** the panel says no definition is available yet and points to term review

### Requirement: Discoverable
Pages with explainable elements SHALL state the gesture (mouse, keyboard and touch) in their help panel, and explainable elements SHALL expose that they have a popup to assistive technology.

#### Scenario: Screen reader
- **WHEN** a screen reader user focuses an explainable element
- **THEN** it is announced as having a dialog popup, and opening the panel presents its text in an announced dialog
