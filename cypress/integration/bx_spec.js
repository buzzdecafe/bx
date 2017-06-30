describe('BX', function(){

  beforeEach(function(){
    cy.visit('https://buzzdecafe.github.io/bx/')
  })

  it('has the correct <title>', () => {
    cy.title().should('equal', 'BX')
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

    describe('Edge cell clicks', () => {
      it('is a Hit, Reflection, or Exit', () => {
        cy.get('.edgeCell').each($pt => {
          debugger;
          var typeCt = 0;
          const wrapped = cy.wrap($pt)
          wrapped.click();
          
          wrapped.should(w => {
            if (w.hasClass('hit')) {
              typeCt += 1;
            }
            if (w.hasClass('reflection')) {
              typeCt += 1;
            }
            if (w.hasClass('selected')) {
              typeCt += 1;
            }
            expect(typeCt).to.eq(1); 
          })
        }); 
      });
    });

    describe('Grid cell events', () => {
      it('adds `guess1` to cell class after one click', () => {
        cy.get('.gridCell').each($pt => {
          cy.wrap($pt).should('not.have.class', 'guess1');
          cy.wrap($pt).should('not.have.class', 'guess2');

          cy.wrap($pt).click();
          cy.wrap($pt).should('have.class', 'guess1');
          cy.wrap($pt).should('not.have.class', 'guess2');
        });
      });

      it('adds `guess2` to cell class after a second click', () => {
        cy.get('.gridCell').each($pt => {
          cy.wrap($pt).click();
          cy.wrap($pt).click();
          cy.wrap($pt).should('not.have.class', 'guess1');
          cy.wrap($pt).should('have.class', 'guess2');
        });
      });

      it('removes `guess*` class after a third click', () => {
        cy.get('.gridCell').each($pt => {
          cy.wrap($pt).click();
          cy.wrap($pt).click();
          cy.wrap($pt).click();
          cy.wrap($pt).should('not.have.class', 'guess1');
          cy.wrap($pt).should('not.have.class', 'guess2');
        });
      });
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

