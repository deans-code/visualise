## ADDED Requirements

### Requirement: Shared control metrics with the profile tool
The system SHALL size and colour its page, surface, text, border, button, input and focus styling to match the profile tool: the same neutral palette in light and dark, the system UI font stack, 10px radius, buttons with a 1px accent border and filled (primary) or outlined (secondary) fill, text inputs and textareas with a 1px neutral border and the same padding, and a visible accent focus outline.

#### Scenario: Side-by-side comparison
- **WHEN** the same control (primary button, secondary button, text input) is compared in both tools in the same theme
- **THEN** font size, height, border width, radius and colours are visually the same

#### Scenario: Contrast still passes
- **WHEN** the automated contrast test runs over the updated tokens
- **THEN** every text/background pair still meets WCAG AA in both themes

### Requirement: Review-terms cards are laid out as forms
Each term awaiting review SHALL appear as a card with an accent top border. Within it the heading and section tag, the source line, a labelled definition field, a labelled category field and its helper text SHALL be stacked, with fields spanning the card width, and the Accept, Reject and Skip buttons SHALL sit together in one row beneath, Accept being the primary button.

#### Scenario: Definition proposed
- **WHEN** a lookup returns a proposed definition
- **THEN** the label is above a full-width textarea showing the whole proposal, and the category field and its "Suggested from similar terms" note are on their own line below it

#### Scenario: No definition found
- **WHEN** no definition is found
- **THEN** the empty textarea has the same size and layout, and Accept is visibly disabled until text is entered

#### Scenario: Narrow screen
- **WHEN** the viewport is 360px wide
- **THEN** the card stacks without horizontal scrolling and the buttons wrap onto a second line only if they do not fit

### Requirement: People list rows are tidy and consistent
Each person SHALL appear as a card showing their name and term count at the start, with Rename and Delete grouped together at the end of the same row, using compact buttons. Cards in a row SHALL have equal height, and the inline rename form SHALL use the same row layout.

#### Scenario: Cards of different name length
- **WHEN** people with short and long names are listed
- **THEN** the buttons are aligned in the same place in every card and a button never sits alone beneath the name unless the name itself wraps

#### Scenario: Renaming
- **WHEN** the user chooses Rename
- **THEN** the name input, Save and Cancel appear in place in the same row layout without changing the card height more than the input requires
