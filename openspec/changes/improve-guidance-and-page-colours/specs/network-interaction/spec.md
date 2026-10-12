## ADDED Requirements

### Requirement: Highlight a group from the legend
Activating a group's legend entry (click, Enter or Space) SHALL highlight that group's people and the lines between them and dim everyone else, and activating it again, or choosing Clear highlight, SHALL restore the normal view. Right-click, `?` and long-press SHALL continue to open the group's explanation.

#### Scenario: Highlight
- **WHEN** the user clicks "Group 2" in the legend
- **THEN** its members stay at full strength, other people and lines are dimmed, and the legend entry is marked as pressed

#### Scenario: Clear
- **WHEN** the user clicks the same entry again
- **THEN** all people and lines return to normal

#### Scenario: Filters change
- **WHEN** a filter change removes or renumbers the highlighted group
- **THEN** the highlight is cleared

#### Scenario: Not colour alone
- **WHEN** a group is highlighted
- **THEN** the pressed state is also exposed as text and to assistive technology, and the selected members keep their shapes and labels
