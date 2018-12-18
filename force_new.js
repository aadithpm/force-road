var width = document.getElementById("chart").clientWidth;
var height = document.getElementById("chart").clientHeight + 200;
var graph = d3.select("#chart").append("svg:svg")
            .attr("width", width)
            .attr("height", height)
            .append("g");

            d3.select("body").call(d3.zoom().on("zoom", function(){

                graph.attr("transform", d3.event.transform);

            })).append("g");

menu_listener();

d3.select("#set-value").on("change", menu_listener);
var data_file;

function menu_listener()
{

    var temp = graph.selectAll("g").remove();
    console.log(temp);
    data_val = d3.select("#set-value").node().value;
    console.log(data_val);
    data_file = data_val + "_Test.json";
    make_graph();
    
}

function make_graph(){

    d3.json(data_file).then(function(json){

        json.links.forEach(function(link, index, list){
            
            this.source = link.source;
            this.target = link.target;

            var these_nodes = json.nodes.filter(function(elem){
                return elem['id'] == this.source || elem['id'] == this.target; 
            });

            if(these_nodes === 'undefined' || these_nodes.length == 0){
                console.log("Node doesn't exist -- Source:", this.source, " -- Target:", this.target);
            }

        });

        var classes = {};
        var types = {};
        var degrees = {};
        var domain = [];
        var weights = [];

        console.log("Storing metadata..");
        json.links.forEach(function(link, index, list){
            
            var this_class = link.class;
            if(classes[this_class] === undefined){
                classes[this_class] = 1;
            }
            else{
                classes[this_class] = classes[this_class] + 1;
            }

            var this_type = link.type;
            if(types[this_type] === undefined){
                types[this_type] = 1;
            }
            else{
                types[this_type] = types[this_type] + 1;
            }

            var this_in = link.source;
            var this_out = link.target;

            if(this_in in degrees)
            {
                degrees[this_in] = degrees[this_in] + 1;
            }
            else
            {
                degrees[this_in] = 1;
            }

            if(this_out in degrees)
            {
                degrees[this_out] = degrees[this_out] + 1;
            }
            else
            {
                degrees[this_out] = 1;
            }

            weights.push(link.weight);
        });

        for(entry in degrees){
            domain.push(degrees[entry]);
        }
        
        var domain_set = Array.from(new Set(domain));

        var node_color = "#FFF896";
        var link_color_s = "#F791CB";
        var link_color_o = "#8FF3BD";
        var node_size = 5;
        
        var color_range = d3.scaleLinear()
        .domain([d3.min(domain_set), d3.max(domain_set)])
        .range([link_color_o, link_color_s]);
        
        var size_range = d3.scaleLinear()
        .domain([d3.min(domain_set), d3.max(domain_set)])
        .range([2, 8]);

        var weight_range = d3.scaleLinear()
        .domain([d3.min(weights), d3.max(weights)])
        .rangeRound([10, 30])
        .nice();
        

        console.log("Assigning values..");
        
        var classes_map = {
            "primary": 8.0,
            "secondary": 2.5,
            "tertiary": 1.0,
            "service": 1.0,
            "track": 1.0,
            "footway": 1.0,
            "residential": 0.5,
            "living_street": 0.5,
            "unclassified": 0.2
        };

        var classes_op_map = {
            "primary": 1.0,
            "secondary": 0.5,
            "tertiary": 0.3,
            "service": 0.3,
            "track": 0.3,
            "footway": 0.3,
            "residential": 0.2,
            "living_street": 0.2,
            "unclassified": 0.2
        };

        var line_styles_map = {
            "standard": link_color_s,
            "oneway": link_color_o
        };


        var hover_links = {};
        json.links.forEach(function(d){

            hover_links[d.source + "," + d.target] = 1;

        });

        console.log("Adding listeners..");
        d3.select("#width").on("change", update);
        d3.select("#nodes").on("change", update);
        d3.select("#degree").on("change", update);
        d3.select("#line-style").on("change", update);
        d3.select("#one-way").on("change", filter);
        d3.select("#standard").on("change", filter);
        d3.select("#primary").on("change", filter);
        d3.select("#secondary").on("change", filter);
        d3.select("#tertiary").on("change", filter);

        d3.selectAll(".checkbox-text")
        .style("color", node_color);

        d3.select("#oneway_text")
        .style("color", link_color_o);

        d3.select("#standard_text")
        .style("color", link_color_s);

        d3.select("#primary_text")
        .style("font-weight", 800);

        d3.select("#secondary_text")
        .style("font-weight", 400);

        d3.select("#tertiary_text")
        .style("font-weight", 100);


        var link, node;

        console.log(json.links);

        var force = d3.forceSimulation(json.nodes)
        .force("link", d3.forceLink(json.links).id(d => d.id).strength(1.0).distance(function(d){
            return weight_range(d.weight);
        }))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("forceX", d3.forceX().x(d => d.x))
        .force("forceY", d3.forceY().y(d => d.y))
        .force("collide", d3.forceCollide(10))
        .on("tick", ticked);

        d3.timeout(function(){

            for(var i = 0, n = Math.ceil(Math.log(force.alphaMin()) 
            / Math.log(1 - force.alphaDecay())); i < n; ++i)
            {
                force.tick();
            }

        });


        link = graph.append("g")
            .attr("stroke", node_color)
            .attr("stroke-opacity", 1.0)
            .selectAll("line")
            .data(json.links)
            .enter()
            .append("g")
            .append("line")
            .attr("stroke-width", 1.0)
            .attr("id", "#edge")
            .on("mouseover", mouse_over())
            .on("mouseout", mouse_out);

        console.log("Links generated");

        node = graph.append("g")
            .selectAll("circle")
            .data(json.nodes)
            .enter()
            .append("circle")
            .attr("r", node_size)
            .attr("fill", node_color)
            .on("mouseover", mouse_over())
            .on("mouseout", mouse_out);
        
        console.log("Nodes generated");

       
        update();
        filter();

        

        console.log("Nodes: ", json.nodes.length);
        console.log("Edges: ", json.links.length);

        function update(){
            
            //graph.selectAll("*").remove();

            link = graph
            .selectAll("line")
            .each(function(d){

                var temp = d3.select(this);
                var this_class = d3.entries(d)[6].value;
                var this_type = d3.entries(d)[7].value;
                
                
                if(d3.select("#width").property("checked")){
                    temp.attr("stroke-width", classes_map[this_class]);
                    temp.attr("stroke-opacity", classes_op_map[this_class]);
                }
                else{
                    temp.attr("stroke-width", 1.0);
                    temp.attr("stroke-opacity", 1.0);
                }

                if(d3.select("#line-style").property("checked")){
                    temp.attr("stroke", line_styles_map[this_type]);
                }
                else{
                    temp.attr("stroke", node_color);
                }

            console.log("Checked road types and classes..");

            });

            node = graph
            .selectAll("circle")
            .each(function(d){

                var temp = d3.select(this);
                var idx = d3.entries(d)[0].value;
                var degree = degrees[idx];
                var temp_size_value = d3.select(this).attr("r");
                var temp_color_value = d3.select(this).attr("fill");


                if(d3.select("#degree").property("checked")){
                    temp.attr("r", size_range(degree));
                    temp.attr("fill", color_range(degree));
                }
                else{
                    temp.attr("r", node_size);
                    temp.attr("fill", node_color);
                }

                if(d3.select("#nodes").property("checked")){
                    temp.attr("opacity", 1.0);
                }
                else{
                    temp.attr("opacity", 0);
                }

                
                console.log("Checked nodes..");

            
            });

            filter();

        };

        function filter(){

            link = graph
            .selectAll("line")
            .each(function(d){

                var temp = d3.select(this);
                var temp_class = d3.entries(d)[6].value; 
                var temp_type = d3.entries(d)[7].value;

                
                
                if(temp_type == "oneway")
                {
                    if(d3.select("#one-way").property("checked")){
                        temp.attr("stroke-opacity", 1.0);
                    }
                    else{
                        temp.attr("stroke-opacity", 0.0);
                    }
                }
                
                if(temp_type == "standard")
                {
                    if(d3.select("#standard").property("checked")){
                        temp.attr("stroke-opacity", 1.0);
                    }
                    else{
                        temp.attr("stroke-opacity", 0.0);
                    }
                }

                if(temp_class == "primary")
                {
                    if(d3.select("#primary").property("checked")){
                        temp.attr("stroke-opacity", 1.0);
                    }
                    else{
                        temp.attr("stroke-opacity", 0.0);
                    }
                }
                if(temp_class == "secondary")
                {
                    if(d3.select("#secondary").property("checked")){
                        temp.attr("stroke-opacity", 1.0);
                    }
                    else{
                        temp.attr("stroke-opacity", 0.0);
                    }
                }
                if(temp_class == "tertiary" ||
                temp_class == "service" ||
                temp_class == "track" ||
                temp_class == "footway" ||
                temp_class == "residential" ||
                temp_class == "living_street" ||
                temp_class == "unclassified")
                {
                    if(d3.select("#tertiary").property("checked")){
                        temp.attr("stroke-opacity", 1.0);
                    }
                    else{
                        temp.attr("stroke-opacity", 0.0);
                    }
                }
            });
        };


        
        

        // Curved links
        /*
        var link = graph.selectAll(".link")
        .data(json.links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("stroke", "#999");

        link.style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '2px')
        
        */

    

        

        function ticked(){
            
            link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
            
        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

    
        // Curved links
        // link.attr("d", position);

            
        }

        function link_exists(s, t){

            return hover_links[s.id + "," + t.id] ||
            hover_links[t.id + "," + s.id] ||
            t.id == s.id;        

        }
        
        function mouse_over(){

            console.log("Calling mouse on event..");
            return function(d){

                node.attr("stroke-opacity", function(o){

                    if(link_exists(o, d) == 1)
                        return 1.0;
                    else
                        return 0.03;

                });

                node.attr("fill-opacity", function(o){

                    if(link_exists(o, d) == 1)
                        return 1.0;
                    else
                        return 0.03;
                });

                link.attr("stroke-opacity", function(o){

                    if(o.source == d || o.target == d)
                        return 1.0;
                    else
                        return 0.03;

                });
                

            };
            
        }

        function mouse_out(){

            node.attr("stroke-opacity", 1);
            node.attr("fill-opacity", 1);
            link.attr("stroke-opacity", 1);
            
            update();
            filter();
        }

        function position(d){

            console.log("Positions:", d);

            var offset = 30;
            var m_x = (d.source.x + d.target.x) / 2;
            var m_y = (d.source.y + d.target.y) / 2;

            var dx = (d.target.x - d.source.x);
            var dy = (d.target.y - d.source.y);

            var normalise = Math.sqrt((dx * dx) + (dy * dy));

            var offsetX = m_x + offset * (dy / normalise);
            var offsetY = m_y - offset * (dx / normalise);

            var ret_str = "M" + d.source.x + "," + d.source.y + "S" + offsetX + "," + offsetY
            + " " + d.target.x + "," + d.target.y;

            console.log(ret_str);

            return ret_str;
        };
    });
}