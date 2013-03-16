// start a marionette application
App = new Backbone.Marionette.Application();
App.addRegions({
	mainRegion: "#content"
});

//models and collection
AngryCat = Backbone.Model.extend({
	defaults: {
		votes: 0
	},
	addVote: function(){
		this.set('votes', this.get('votes')+1);
	},
	rankUp: function(){
		this.set({rank: this.get('rank')-1});
	},
	rankDown: function(){
		this.set({rank: this.get('rank')+1});
	}
});
AngryCats = Backbone.Collection.extend({
	initialize: function(cats){
		var rank = 1;
		_.each(cats, function(cat){
			cat.set('rank', rank);
			++rank;
		});

		var self=this;
		App.vent.on("rank:up", function(cat){
			if(cat.get('rank')==1){
				//cant increase rank of top ranked cat
				return true;
			}
			self.rankUp(cat);
			self.sort();
		});
		App.vent.on("rank:down", function(cat){
			if(cat.get('rank')==self.size()){
				//cant decrease rank
				return true;
			}
			self.rankDown(cat);
			self.sort();
		});
		App.vent.on('cat:disqualify', function(cat){
			var disqualifiedRank= cat.get('rank');
			catsToUprank = self.filter(function(cat){
				return cat.get('rank') > disqualifiedRank
			});
			catsToUprank.forEach(function(cat){
				cat.rankUp();
			});
			self.trigger('reset');
		})
/*		this.on('add', function(cat){
			if(!cat.get('rank')){
				var error = Error("Cat must have a rank defined before being added to the collection");
				error.name = "NoRankError";
				throw error;
			}
		})*/
	},
	model: AngryCat,
	comparator: function(cat){
		return cat.get('rank');
	},
	rankUp: function(cat){
		var rankToSwap = cat.get('rank')-1;
		var otherCat = this.at(rankToSwap-1);
		cat.rankUp();
		otherCat.rankDown();
	},
	rankDown: function(cat){
		var rankToSwap = cat.get('rank')+1;
		var otherCat = this.at(rankToSwap-1);
		cat.rankDown();
		otherCat.rankUp();
	}
});

//view
AngryCatView = Backbone.Marionette.ItemView.extend({
	initialize: function(){
		//listen to the model vote (or other attr) changing and then re-render
		this.listenTo(this.model,'change:votes', this.render);
	},
	template: "#angry_cat-template",
	tagName: "tr",
	className: "angry_cat",
	events: {
		'click .rank_up img': 'rankUp',
		'click .rank_down img': 'rankDown',
		'click a.disqualify':'disqualify'
	},
	rankUp: function(){
		this.model.addVote();
		App.vent.trigger('rank:up', this.model);
	},
	rankDown: function(){
		this.model.addVote();
		App.vent.trigger('rank:down', this.model);
	},
	disqualify: function(){
		App.vent.trigger('cat:disqualify', this.model);
		//marionette auto remove the view after destroying model! :O
		this.model.destroy();
	}
})

AngryCatsView = Backbone.Marionette.CompositeView.extend({
	initialize: function(){
		//auto render on sort -- see docs
		//use renderCollection to re-render the collection views
		//use render only if you want to re-render everything
    this.listenTo(this.collection, "sort", this.renderCollection);
  },
	tagName: "table",
	id: "angry_cats",
	className: "table-striped table-bordered",
	template: "#angry_cats-template",
	itemViewContainer: 'tbody',
	itemView: AngryCatView/*,
	appendHtml: function(collectionView, itemView){
		collectionView.$('tbody').append(itemView.el);
	}*/
})

App.addInitializer(function(options){
	var angryCatsView = new AngryCatsView({
		collection: options.cats
	});
	App.mainRegion.show(angryCatsView);
})

$(function(){
	var cats = new AngryCats([
		new AngryCat({name: 'Wet Cat', image_path: 'assets/img/cat2.jpg'}),
		new AngryCat({name: 'Bitey Cat', image_path: 'assets/img/cat1.jpg'}),
		new AngryCat({name: 'Surprised Cat', image_path: 'assets/img/cat3.jpg'})
	]);

	App.start({cats: cats});
	//test how marionette auto render works with new model additions
	setTimeout(function(){cats.add(new AngryCat({name: 'Cranky Cat', image_path:'assets/img/cat4.jpg', rank: cats.size()+1}))}, 3000);
})