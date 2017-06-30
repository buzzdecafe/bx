describe('BX', function(){

  beforeEach(function(){
    cy.visit('https://buzzdecafe.github.io/bx')
    // **** Resetting State Before Each Test ****
    //
    // Visiting our app before each test
    // removes any state build up from
    // previous tests. Visiting acts as if
    // we closed a tab and opened a fresh one
    //
    // By default Cypress also automatically
    // clears the Local Storage and Cookies
    // before each test.
  })

  it('has the correct <title>', () => {

    // https://on.cypress.io/api/visit

    // **** Making Assertions ****
    //
    // Here we've made our first assertion using a 'cy.should()' command.
    // An assertion is comprised of a chainer, subject, and optional value.
    // Chainers are available from Chai, Chai-jQuery, and Chai-Sinon.
    // https://on.cypress.io/guides/making-assertions
    //
    // https://on.cypress.io/api/should
    // https://on.cypress.io/api/and

    // https://on.cypress.io/api/title
    cy.title().should('equal', 'BX')
    //   ↲               ↲            ↲
    // subject        chainer      value
  })

  it('has a game board', () => {
    cy.get('.board').should(b => b instanceof HTMLElement);
  });

  describe('The game board', () => {

    it('contains 100 child nodes', () => { 
      // 100 is the default -- in future this may be configurable
      cy.get('.board').children().should(cs => cs.length === 100);
    });

    it('contains 100 cell divs', () => { 
      // 100 is the default -- in future this may be configurable
      cy.get('.board').children('.cell').should(cs => cs.length === 100);
    });

    it('contains 32 edge cells', () => {
      cy.get('.board').children('.edgeCell').should(es => es.length === 32);
    });

    it('contains 64 grid cells', () => {
      cy.get('.board').children('.gridCell').should(es => es.length === 64);
    });

    it('contains 4 corner cells', () => {
      cy.get('.board').children('.corner').should(cs => cs.length === 4);
    });

    describe('Edge cell events', () => {
      
    });

    describe('Grid cell events', () => {

    });
  
  });

  describe('Header', () => {
    describe('Query counter', () => {
      it('has a `queries` counter view', () => {
        cy.get('#queries').should('contain', '0')
      });
      
      it('increments its value when an edge cell is clicked', () => {
        cy.get('#pt-9-3.edgeCell').click();
        cy.get('#queries').should('contain', '1');
        cy.get('#pt-3-0.edgeCell').click();
        cy.get('#queries').should('contain', '2');
        cy.get('#pt-0-7.edgeCell').click();
        cy.get('#queries').should('contain', '3');
      });
    });

    describe('`Check solution` button', () => {
      it('has the correct text', () => {
        cy.get('#attempt').should('contain', 'Check solution');
      });

      it('is disabled', () => {
        cy.get('#attempt').should(b => b.disabled);
      });

      it('becomes enabled when there are 5 solid guesses on the grid', () => {
        cy.get('#pt-1-1').click();
        cy.get('#pt-1-1').click();
        cy.get('#attempt').should('be.disabled');

        cy.get('#pt-2-3').click();
        cy.get('#pt-2-3').click();
        cy.get('#attempt').should('be.disabled');

        cy.get('#pt-2-7').click();
        cy.get('#pt-2-7').click();
        cy.get('#attempt').should('be.disabled');

        cy.get('#pt-6-4').click();
        cy.get('#pt-6-4').click();
        cy.get('#attempt').should('be.disabled');

        cy.get('#pt-4-1').click();
        cy.get('#pt-4-1').click();
        cy.get('#attempt').should('not.be.disabled');
      });
    });
  });
});

