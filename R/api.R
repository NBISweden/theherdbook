library(optiSel)
library(nprcgenekeepr)
library(digest)
library(rjson)
library(dplyr)

#Only load the environment one
api_base   <- Sys.getenv("API_BASE", "http://herdbook-main:9000/api/")
auth_header <- Sys.getenv("API_AUTH", "")


our_headers <- function() {
  tmp <- unlist(strsplit(auth_header, ":"))

  if (length(tmp) == 1) {
    name <- 'Authorization'
  } else {
    name <-tmp[1]
    tmp <- tmp[2:length(tmp)]
  }

  ret <- c(tmp[1])
  names(ret) <- c(name)
  return (ret)
}

get_resource <- function(resource) {
  print(paste0("Fetching resource ", resource))
  c <-url( paste0(api_base,resource), headers = our_headers())

  res <-fromJSON(paste(readLines(c), collapse=""))
  return (res)
}

#Get available genebank ids in the database
get_all_genebanks <- function() {
  js <- get_resource("genebanks")

  return(js[1][[1]])
}

#Return the digest of the current individuals in the corresponding genebank 
get_modifications_digest <- function(genebank_id){
  #' Get digest of the current individuals in a given genebank
  #'
  #' @description This function calculate the digest of all the individual numbers of the given genebank.
  #'
  #' @param genebank_id The Genebank ID to get the individual number list from.
  #' @details If the digest changes we know we need to recalculate

  individuals <- get_resource(paste0("genebank/",genebank_id,"/individuals"))
  return (digest(individuals))
}

# Returns a data structure with selected individuals' ancestry information for genebank_id 
# 1 Gotlandskanin 2, Mellerud
#Format as pedigre using optiSel library

get_rabbits<-function(genebank_id){
  rabbits <- get_all_individuals(genebank_id)

  if (is.null(rabbits) || (length(rabbits) == 0)) {
     return(NULL)
  }
  
   names(rabbits)<-c("Indiv","Sire","Dam","Sex", "Born", "is_active")
   print("Calling on optisel")

   Pedi <- optiSel::prePed(rabbits)
   print("Return from optisel")
   return(Pedi)

}


#Human readable version of all animals from the given genebank_id
get_all_individuals <- function(genebank_id) {
  js <- get_resource(paste0("genebank/",genebank_id,"/individuals"))
  
  tmp<-do.call('rbind', 
        lapply(js$individuals, 
               function(x) { 
                 unlist(x)[c('id', 'mother.id', 'father.id', 'sex', 'birth_date','active')]
               }
          )
    )

  if (length(tmp) == 0) {
   return(NULL)
  }

  df <- rename(
    mutate(
      mutate(data.frame(tmp),
  	     Born = as.numeric(substr(birth_date, 1, 4)),
	     .after=4),
	   birth_date = NULL),
    Indiv=id, Sire=father.id, Dam=mother.id, Sex=sex, is_active = active)
  print(df)
  return (df)
}


# Function to Preload data on startup
update_preload_all_data <- function() {
  genebanks<<-get_all_genebanks()
  for(i in genebanks){
    print(i$id)
    assign(paste0("MOD_",i$id),get_modifications_digest(i$id),envir = .GlobalEnv)
    update_data(i$id)
  }
}


#Update and calculate the Kinship matrix and inbreeding
update_data <- function(genebank_id) {
  Pedi<-get_rabbits(genebank_id)
  if (is.null(Pedi)) {
      return (NULL)
  }

  #Calculate Inbreeding and name it after genebank_id
  assign(paste0("IDB_",genebank_id),data.frame(number=Pedi[,1], Inbr=pedigree::calcInbreeding(Pedi[,1:3]), stringsAsFactors = FALSE),envir = .GlobalEnv)
  #Get current active population
  keep<-Pedi[Pedi$is_active == "TRUE",]$Indiv
  #Calculate Kinship of current population and return Kinship matrix and Meankinship
  assign(paste0("KIN_",genebank_id),optiSel::pedIBD(Pedi,keep.only=keep),envir = .GlobalEnv)
  assign(paste0("MK_",genebank_id),colMeans(get(paste0("KIN_",genebank_id))),envir = .GlobalEnv)
}

#* @serializer csv
#* @get /kinship/<genebank_id:int>
calculate_kinship <- function(genebank_id, update_data="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_data){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
   }
  return(as.data.frame(get(paste0("KIN_",genebank_id))))
}

#For Future use
# Calculates founder Equivalents
# @return The founder equivalents \code{FE = 1 / sum(p ^ 2)}, where \code{p}
# is average number of descendants and \code{r} is the mean number of founder
# alleles retained in the gene dropping experiment.
calculateFEFG <- function() {
  Pedi<-get_rabbits(genebank_id)

  if (is.null(Pedi)) {
     return
  }

  ped<- data.frame(
    id = Pedi$Indiv,
    sire = Pedi$Sire,
    dam = Pedi$Dam,
    stringsAsFactors = TRUE)
  ped["gen"] <- findGeneration(ped$id, ped$sire, ped$dam)
  ped$population <- getGVPopulation(ped, keep)
  fe <- calcFE(ped)
  allelesFactors <- geneDrop(ped$id, ped$sire, ped$dam, ped$gen,, genotype = NULL, n = 5000, updateProgress = NULL)
}


#Updated and reload the data structures from the sql server
#* @get /update-db/
update_data_cron <- function() {
  for(i in genebanks$genebank_id){
    MOD_change<-get_modifications_digest(i)
    if(get(paste0("MOD_",i))!= MOD_change)
    {
      assign(paste0("MOD_",i),MOD_change,envir = .GlobalEnv)
      update_data(i)
      print(paste0("Updated genebank id: ",i))
    }
  }
}

#* @serializer csv
#* @get /inbreeding/<genebank_id:int>
inbreeding <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
  }
  return (get(paste0("IDB_",genebank_id)))
}


#* @serializer csv
#* @get /meankinship/<genebank_id:int>
meankinship <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
  }
  return(
    data.frame(number=names(get(paste0("MK_",genebank_id))), MK=get(paste0("MK_",genebank_id)), row.names=NULL)
  )
}

#RUN stuff and preload
update_preload_all_data()

