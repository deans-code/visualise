# network-interaction Specification

## Purpose

Lets users rearrange the people in the network view by hand so they can untangle clusters and inspect connections without losing selection or explanations.

## Requirements

### Requirement: Drag to move
The system SHALL let the user press on a person's node in the network view and move it; connected edges and labels SHALL follow live and the node SHALL stay where it is dropped, within the canvas.

#### Scenario: Drag a node
- **WHEN** the user drags a node 100px to the right
- **THEN** the node and its edges move with the pointer and remain there on release

### Requirement: Click is still select
A press that moves less than 4px SHALL count as a click and select the person as before; a press that becomes a drag SHALL NOT change the selection.

#### Scenario: Click without movement
- **WHEN** the user clicks a node without moving
- **THEN** the person is selected

#### Scenario: Drag does not select
- **WHEN** the user drags a node
- **THEN** the selection is unchanged on release

### Requirement: Keyboard alternative
A focused node SHALL be movable with the arrow keys (larger steps with Shift), so dragging is never the only way to move it.

#### Scenario: Arrow key
- **WHEN** a node is focused and the user presses the right arrow key
- **THEN** the node moves right by a small step

### Requirement: Touch and explanations coexist
Dragging SHALL work with touch and pen without scrolling the page; a touch long-press without movement SHALL still open the explanation, and movement SHALL cancel the long-press.

#### Scenario: Long press
- **WHEN** the user presses and holds a node for 500ms without moving
- **THEN** the explanation opens and no drag begins

### Requirement: Reset layout
A Reset layout control SHALL restore the computed arrangement. Manual positions SHALL be cleared when the filters or the data change, and SHALL NOT persist across reloads.

#### Scenario: Reset
- **WHEN** the user has moved nodes and activates Reset layout
- **THEN** all nodes return to their computed positions

### Requirement: Network view only
Dragging SHALL apply to the network view only; the matrix, bipartite and category views keep their fixed layouts.

#### Scenario: Other views
- **WHEN** the user presses and moves on an item in the matrix view
- **THEN** nothing is repositioned
